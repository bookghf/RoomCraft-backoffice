// Turns a 3D file picked in the browser into one .glb, the only format the apps load.
// Runs in the browser only; three.js is loaded on demand so it doesn't weigh down other pages.

import type { LoadingManager, Material, Object3D, Texture } from "three";

/** File types the back office accepts. Everything except .glb is converted to .glb before upload. */
export const MODEL_EXTENSIONS = ["glb", "gltf", "fbx", "obj", "dae", "kmz", "stl", "zip"] as const;
export const MODEL_ACCEPT = [...MODEL_EXTENSIONS.map((e) => `.${e}`), ".skp"].join(",");

/** Largest file we try to read in the browser. */
export const MAX_INPUT_BYTES = 200 * 1024 * 1024;

export class ModelFileError extends Error {}

const SKP_HELP =
  "SketchUp (.skp) files can't be read outside SketchUp. In SketchUp choose File → Export → 3D Model and save as .dae (COLLADA), .fbx, .obj or .glb, then upload that file. In SketchUp for Web you can also download as .stl, or install a glTF exporter extension.";

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Checks a picked file before any work starts. Returns a message to show, or "" when it can be used. */
export function checkModelFile(file: File): string {
  const ext = extensionOf(file.name);
  if (ext === "skp") return SKP_HELP;
  if (!(MODEL_EXTENSIONS as readonly string[]).includes(ext)) return `.${ext} files aren't supported. Use ${MODEL_EXTENSIONS.map((e) => `.${e}`).join(", ")}.`;
  if (file.size > MAX_INPUT_BYTES) return `The file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_INPUT_BYTES / 1024 / 1024} MB.`;
  return "";
}

function isGlb(buf: ArrayBuffer) {
  return buf.byteLength > 12 && new TextDecoder().decode(new Uint8Array(buf, 0, 4)) === "glTF";
}

/** A loading manager that serves textures and side files from `files` and lets us wait for every load to end. */
async function trackingManager(files: Record<string, Uint8Array>) {
  const { LoadingManager } = await import("three");
  const manager = new LoadingManager();
  const urls: string[] = [];
  const find = (url: string) => {
    const clean = decodeURIComponent(url.split(/[?#]/)[0]).replace(/\\/g, "/").toLowerCase();
    const name = clean.split("/").pop() ?? clean;
    const keys = Object.keys(files);
    return keys.find((k) => k.toLowerCase() === clean) ?? keys.find((k) => k.toLowerCase().endsWith(`/${name}`) || k.toLowerCase() === name);
  };
  manager.setURLModifier((url) => {
    if (/^(data|blob):/.test(url)) return url;
    const key = find(url);
    if (!key) return url;
    const blobUrl = URL.createObjectURL(new Blob([files[key] as BlobPart]));
    urls.push(blobUrl);
    return blobUrl;
  });
  let pending = 0;
  let wake: (() => void) | undefined;
  manager.itemStart = ((start) => (url: string) => {
    pending++;
    start(url);
  })(manager.itemStart.bind(manager));
  manager.itemEnd = ((end) => (url: string) => {
    pending--;
    end(url);
    if (pending <= 0) wake?.();
  })(manager.itemEnd.bind(manager));
  // Failed loads call itemError then itemEnd, so `pending` still reaches zero.

  /** Resolves once nothing is loading, or after `ms` so a stuck texture can't hang the upload. */
  const settled = (ms = 20000) =>
    new Promise<void>((resolve) => {
      if (pending <= 0) return resolve();
      const t = setTimeout(resolve, ms);
      wake = () => {
        clearTimeout(t);
        resolve();
      };
    });
  const dispose = () => urls.forEach((u) => URL.revokeObjectURL(u));
  return { manager, settled, dispose };
}

/** Picks the model inside a .zip or .kmz: the first .gltf, .glb, .fbx, .obj or .dae it finds. */
function mainFileIn(files: Record<string, Uint8Array>) {
  const names = Object.keys(files).filter((n) => !n.startsWith("__MACOSX/") && !n.endsWith("/"));
  for (const ext of ["glb", "gltf", "fbx", "obj", "dae"]) {
    const hit = names.find((n) => extensionOf(n) === ext);
    if (hit) return hit;
  }
  if (names.some((n) => extensionOf(n) === "skp")) throw new ModelFileError(SKP_HELP);
  throw new ModelFileError("The archive has no .glb, .gltf, .fbx, .obj or .dae file in it.");
}

async function parse(name: string, data: ArrayBuffer, files: Record<string, Uint8Array>, manager: LoadingManager): Promise<Object3D> {
  const ext = extensionOf(name);
  const text = () => new TextDecoder().decode(data);
  switch (ext) {
    case "glb":
    case "gltf": {
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const gltf = await new GLTFLoader(manager).parseAsync(ext === "glb" ? data : text(), "");
      return gltf.scene;
    }
    case "fbx": {
      const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
      return new FBXLoader(manager).parse(data, "");
    }
    case "obj": {
      const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
      const loader = new OBJLoader(manager);
      const mtlName = text().match(/^mtllib\s+(.+)$/m)?.[1]?.trim();
      const mtlKey = mtlName && Object.keys(files).find((k) => k.toLowerCase().endsWith(mtlName.toLowerCase()));
      if (mtlKey) {
        const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
        const materials = new MTLLoader(manager).parse(new TextDecoder().decode(files[mtlKey]), "");
        materials.preload();
        loader.setMaterials(materials);
      }
      return loader.parse(text());
    }
    case "dae": {
      const { ColladaLoader } = await import("three/examples/jsm/loaders/ColladaLoader.js");
      const result = new ColladaLoader(manager).parse(text(), "");
      if (!result?.scene) throw new ModelFileError("The COLLADA file couldn't be read.");
      return result.scene;
    }
    case "stl": {
      const [{ STLLoader }, { Mesh, MeshStandardMaterial }] = await Promise.all([import("three/examples/jsm/loaders/STLLoader.js"), import("three")]);
      const geometry = new STLLoader(manager).parse(data);
      const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: geometry.hasAttribute("color") ? 0xffffff : 0xcccccc, vertexColors: geometry.hasAttribute("color") }));
      mesh.rotation.x = -Math.PI / 2; // STL is Z-up; the apps are Y-up.
      return mesh;
    }
  }
  throw new ModelFileError(`.${ext} files aren't supported.`);
}

/** Drops textures whose image never loaded (missing side files) so the export doesn't fail. */
function dropBrokenTextures(root: Object3D) {
  let dropped = 0;
  root.traverse((o) => {
    const mats = (o as { material?: Material | Material[] }).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      const rec = m as unknown as Record<string, unknown>;
      for (const key of Object.keys(rec)) {
        const t = rec[key] as Texture | null;
        if (t && (t as { isTexture?: boolean }).isTexture) {
          const img = t.image as { width?: number } | undefined;
          if (!img || !img.width) {
            rec[key] = null;
            m.needsUpdate = true;
            dropped++;
          }
        }
      }
    }
  });
  return dropped;
}

export interface ConvertedModel {
  file: File;
  /** True when the picked file was already a .glb and is uploaded unchanged. */
  passthrough: boolean;
  /** Notes worth showing, e.g. textures that were missing. */
  warnings: string[];
}

/** Reads any supported 3D file and returns a .glb ready to upload. */
export async function toGlb(input: File): Promise<ConvertedModel> {
  const problem = checkModelFile(input);
  if (problem) throw new ModelFileError(problem);
  const baseName = input.name.replace(/\.[^.]+$/, "") || "model";
  let data = await input.arrayBuffer();
  let name = input.name;
  let files: Record<string, Uint8Array> = {};

  const ext = extensionOf(name);
  if (ext === "glb") {
    if (!isGlb(data)) throw new ModelFileError("This file isn't a valid .glb.");
    return { file: input, passthrough: true, warnings: [] };
  }
  if (ext === "zip" || ext === "kmz") {
    const { unzipSync } = await import("three/examples/jsm/libs/fflate.module.js");
    try {
      files = unzipSync(new Uint8Array(data));
    } catch {
      throw new ModelFileError("The archive couldn't be opened.");
    }
    name = mainFileIn(files);
    const inner = files[name];
    data = inner.buffer.slice(inner.byteOffset, inner.byteOffset + inner.byteLength) as ArrayBuffer;
    if (extensionOf(name) === "glb" && Object.keys(files).length === 1) {
      return { file: new File([data], `${baseName}.glb`, { type: "model/gltf-binary" }), passthrough: false, warnings: [] };
    }
  }

  const { manager, settled, dispose } = await trackingManager(files);
  const warnings: string[] = [];
  try {
    let root: Object3D;
    try {
      root = await parse(name, data, files, manager);
    } catch (e) {
      if (e instanceof ModelFileError) throw e;
      const hint = extensionOf(name) === "gltf" ? " A .gltf that points to separate .bin or texture files must be uploaded as a .zip with those files, or exported as .glb." : "";
      throw new ModelFileError(`The file couldn't be read: ${e instanceof Error ? e.message : String(e)}.${hint}`);
    }
    await settled();
    const dropped = dropBrokenTextures(root);
    if (dropped) warnings.push(`${dropped} texture${dropped === 1 ? "" : "s"} couldn't be found and ${dropped === 1 ? "was" : "were"} left out. Upload a .zip with the model and its texture files to keep them.`);

    let meshes = 0;
    root.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) meshes++;
    });
    if (!meshes) throw new ModelFileError("The file has no 3D geometry in it.");

    const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
    const out = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
    if (!(out instanceof ArrayBuffer)) throw new ModelFileError("The model couldn't be converted to .glb.");
    return { file: new File([out], `${baseName}.glb`, { type: "model/gltf-binary" }), passthrough: false, warnings };
  } finally {
    dispose();
  }
}
