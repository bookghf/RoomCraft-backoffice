"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Group, Object3D } from "three";

interface Size {
  w: number;
  d: number;
  h: number;
}

/**
 * Interactive preview of an item's .glb, drawn the way the designer app draws it:
 * scaled uniformly to fit inside the item size (shown as an outline), in the file's own colours.
 * Drag to orbit, scroll to zoom.
 */
export default function ModelPreview({ url, size }: { url: string; size: Size }) {
  const host = useRef<HTMLDivElement>(null);
  // Which URL finished loading, and whether it worked. Anything else means loading.
  const [loaded, setLoaded] = useState<{ url: string; ok: boolean } | null>(null);
  const state = loaded?.url !== url ? "loading" : loaded.ok ? "ready" : "error";
  // Live three.js objects, created once per mount.
  const view = useRef<{
    three: typeof import("three");
    render: () => void;
    holder: Group;
    outline: Object3D;
    model?: Object3D;
    frame: (s: Size) => void;
  } | null>(null);
  const latest = useRef({ size });
  useEffect(() => {
    latest.current = { size };
  });

  // Renderer, camera, lights and controls.
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const three = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const el = host.current;
      if (disposed || !el) return;
      const renderer = new three.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = three.SRGBColorSpace;
      renderer.toneMapping = three.ACESFilmicToneMapping;
      el.appendChild(renderer.domElement);
      const scene = new three.Scene();
      scene.background = new three.Color("#f4f4f5");
      scene.add(new three.HemisphereLight(0xffffff, 0xb0b0b0, 1.6));
      const sun = new three.DirectionalLight(0xffffff, 2);
      sun.position.set(3, 5, 4);
      scene.add(sun);
      const grid = new three.GridHelper(10, 20, 0xc4c4c8, 0xdedee2);
      scene.add(grid);
      const holder = new three.Group();
      scene.add(holder);
      const outline = new three.LineSegments(new three.EdgesGeometry(new three.BoxGeometry(1, 1, 1)), new three.LineBasicMaterial({ color: 0x6b7280, transparent: true, opacity: 0.6 }));
      scene.add(outline);
      const camera = new three.PerspectiveCamera(40, 1, 0.01, 200);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      let raf = 0;
      const render = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (controls.update()) render();
          renderer.render(scene, camera);
        });
      };
      controls.addEventListener("change", render);
      const resize = () => {
        const { clientWidth: w, clientHeight: h } = el;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
        render();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      /** Points the camera at a box of size `s` standing on the floor. */
      const frame = (s: Size) => {
        const r = Math.max(s.w, s.d, s.h, 0.1);
        controls.target.set(0, s.h / 2, 0);
        camera.position.set(r * 1.4, s.h / 2 + r * 0.9, r * 1.9);
        camera.near = r / 100;
        camera.far = r * 100;
        camera.updateProjectionMatrix();
        grid.scale.setScalar(Math.max(0.2, r / 2));
        render();
      };
      view.current = { three, render, holder, outline, frame };
      resize();
      frame(latest.current.size);
      cleanup = () => {
        ro.disconnect();
        cancelAnimationFrame(raf);
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
      view.current = null;
    };
  }, []);

  // Load the model when the URL changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Wait for the renderer from the first effect.
      while (!view.current && !cancelled) await new Promise((r) => setTimeout(r, 30));
      const v = view.current;
      if (!v || cancelled) return;
      try {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const gltf = await new GLTFLoader().loadAsync(url);
        if (cancelled) return;
        if (v.model) v.holder.remove(v.model);
        const model = gltf.scene;
        v.model = model;
        v.holder.add(model);
        setLoaded({ url, ok: true });
      } catch {
        if (!cancelled) setLoaded({ url, ok: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Fit the model inside the item size, origin at bottom-centre, like the designer app.
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    v.outline.scale.set(size.w || 0.01, size.h || 0.01, size.d || 0.01);
    v.outline.position.set(0, (size.h || 0) / 2, 0);
    if (v.model) {
      const { Box3, Vector3 } = v.three;
      v.holder.scale.setScalar(1);
      v.holder.position.set(0, 0, 0);
      v.holder.updateMatrixWorld(true);
      const box = new Box3().setFromObject(v.model);
      const dim = box.getSize(new Vector3());
      const scale = Math.min(size.w / (dim.x || 1), size.h / (dim.y || 1), size.d / (dim.z || 1));
      const centre = box.getCenter(new Vector3());
      v.holder.scale.setScalar(scale);
      v.holder.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);
    }
    v.frame(size);
  }, [size, state]);


  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-zinc-100">
      <div ref={host} className="absolute inset-0" />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          {state === "loading" ? <Loader2 size={18} className="animate-spin" /> : "The model couldn't be loaded."}
        </div>
      )}
      {state === "ready" && <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/80 px-1.5 py-0.5 text-[11px] text-muted">Drag to turn · scroll to zoom · outline = item size</span>}
    </div>
  );
}
