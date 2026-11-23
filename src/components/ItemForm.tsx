"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormMessage, SubmitButton } from "./forms";
import { buttonClass } from "./ui";
import ModelUpload from "./ModelUpload";
import dynamic from "next/dynamic";
import ThumbnailUpload from "./ThumbnailUpload";
import { parseColorMaterials, withColorMaterials } from "@/lib/colorMaterials";
import { saveItem } from "@/lib/actions/catalog";
import type { AdminItem, CatalogColor, Category } from "@/lib/types";

type Mount = AdminItem["mount"];

const LANGS = [
  ["en", "English"],
  ["th", "ไทย"],
  ["zh", "中文"],
] as const;

const blank: Omit<AdminItem, "publishState" | "createdAt" | "updatedAt" | "sortOrder"> = {
  id: "",
  category: "",
  mount: "floor",
  name: { en: "", th: "", zh: "" },
  price: 0,
  priceSatang: 0,
  size: { w: 0.5, d: 0.5, h: 0.5 },
  colors: [{ id: "default", hex: "#c8a27a", name: { en: "Default", th: "", zh: "" } }],
  model: { template: "shape", params: {} },
};

function Field({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

// three.js only loads on items that have a model.
const ModelPreview = dynamic(() => import("./ModelPreview"), { ssr: false });

/** Create or edit a catalog item. Builds the API payload in the browser and sends it as one JSON field. */
export default function ItemForm({ item, categories, templates, readOnly }: { item?: AdminItem; categories: Category[]; templates: string[]; readOnly?: boolean }) {
  const [state, action] = useActionState(saveItem, {});
  const start = item ?? { ...blank, category: categories[0]?.id ?? "" };
  const [v, setV] = useState({
    ...start,
    priceTHB: String((start.priceSatang ?? 0) / 100),
    mountHeight: start.mountHeight === undefined ? "" : String(start.mountHeight),
    paramsText: JSON.stringify(start.model.params ?? {}, null, 2),
  });
  // Count of uploads in progress; saving waits until they finish.
  const [uploads, setUploads] = useState(0);
  const trackUpload = (busy: boolean) => setUploads((n) => Math.max(0, n + (busy ? 1 : -1)));
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((s) => ({ ...s, [k]: value }));
  const setColor = (i: number, c: Partial<CatalogColor>) => set("colors", v.colors.map((x, j) => (j === i ? { ...x, ...c, name: { ...x.name, ...c.name } } : x)));

  const paramsError = useMemo(() => {
    try {
      const p = JSON.parse(v.paramsText || "{}");
      return p && typeof p === "object" && !Array.isArray(p) ? "" : "Must be a JSON object";
    } catch {
      return "Not valid JSON";
    }
  }, [v.paramsText]);

  // Parts of the .glb that follow the customer's colour, kept in the template parameters.
  const params = useMemo<Record<string, unknown>>(() => {
    try {
      const p = JSON.parse(v.paramsText || "{}");
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }, [v.paramsText]);
  const colorMaterials = useMemo(() => parseColorMaterials(params), [params]);
  const setColorMaterials = (names: string[]) => set("paramsText", JSON.stringify(withColorMaterials(params, names), null, 2));
  const [materials, setMaterials] = useState<string[] | null>(null);
  const [previewColor, setPreviewColor] = useState(0);

  const payload = useMemo(() => {
    if (paramsError) return "";
    const isFloor = v.mount === "floor";
    return JSON.stringify({
      id: v.id.trim(),
      category: v.category,
      mount: v.mount,
      name: v.name,
      priceSatang: Math.round(parseFloat(v.priceTHB || "0") * 100),
      sku: v.sku?.trim() || undefined,
      size: { w: Number(v.size.w), d: Number(v.size.d), h: Number(v.size.h) },
      colors: v.colors.map((c) => ({ ...c, id: c.id.trim() })),
      surface: isFloor && !!v.surface,
      stackable: isFloor && !!v.stackable,
      flat: isFloor && !!v.flat,
      light: !!v.light,
      hidden: !!v.hidden,
      mountHeight: v.mountHeight === "" ? undefined : Number(v.mountHeight),
      model: { template: v.model.template.trim(), params: JSON.parse(v.paramsText || "{}") },
      modelUrl: v.modelUrl?.trim() || undefined,
      thumbnailUrl: v.thumbnailUrl?.trim() || undefined,
    });
  }, [v, paramsError]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={payload} />
      <input type="hidden" name="mode" value={item ? "update" : "create"} />
      <FormMessage state={state} />
      <fieldset disabled={readOnly} className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <Field label="Item id" hint={item ? "Can't change: saved designs refer to it." : "Lowercase, e.g. chair-oak-2"}>
            <input className="input font-mono" value={v.id} onChange={(e) => set("id", e.target.value)} disabled={!!item} required pattern="[A-Za-z0-9_\-]{1,64}" />
          </Field>
          <Field label="Category">
            <select className="input" value={v.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name.en}</option>
              ))}
            </select>
          </Field>
          <Field label="Mount">
            <select className="input" value={v.mount} onChange={(e) => set("mount", e.target.value as Mount)}>
              <option value="floor">Floor</option>
              <option value="wall">Wall</option>
              <option value="ceiling">Ceiling</option>
            </select>
          </Field>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {LANGS.map(([lang, label]) => (
            <Field key={lang} label={`Name (${label})`}>
              <input className="input" value={v.name[lang] ?? ""} onChange={(e) => set("name", { ...v.name, [lang]: e.target.value })} required />
            </Field>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (THB)">
            <input className="input tabular-nums" type="number" min={0} step="0.01" value={v.priceTHB} onChange={(e) => set("priceTHB", e.target.value)} required />
          </Field>
          <Field label="SKU" hint="Optional product code">
            <input className="input font-mono" value={v.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
          </Field>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Size and placement</h3>
          <p className="-mt-1 mb-2 text-xs text-muted">Filled in from the 3D model when you upload one. The apps use it for placement and collisions, and fit the model inside it.</p>
          <div className="grid gap-4 sm:grid-cols-4">
            {(["w", "d", "h"] as const).map((k) => (
              <Field key={k} label={{ w: "Width (m)", d: "Depth (m)", h: "Height (m)" }[k]}>
                <input className="input tabular-nums" type="number" min={0.01} step="0.01" value={v.size[k]} onChange={(e) => set("size", { ...v.size, [k]: Number(e.target.value) })} required />
              </Field>
            ))}
            <Field label="Mount height (m)" hint="Default bottom height for wall items">
              <input className="input tabular-nums" type="number" min={0} max={3} step="0.01" value={v.mountHeight} onChange={(e) => set("mountHeight", e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(
              [
                ["surface", "Surface: small items can stand on it", true],
                ["stackable", "Stackable: can stand on a surface", true],
                ["flat", "Flat (rugs): only walls block it", true],
                ["light", "Light: glows when lights are on", false],
                ["hidden", "Hidden from the catalog picker", false],
              ] as const
            ).map(([k, label, floorOnly]) => (
              <label key={k} className={`flex items-center gap-2 ${floorOnly && v.mount !== "floor" ? "opacity-40" : ""}`}>
                <input type="checkbox" className="accent-brand" checked={!!v[k]} disabled={floorOnly && v.mount !== "floor"} onChange={(e) => set(k, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Colours</h3>
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => set("colors", [...v.colors, { id: "", hex: "#cccccc", name: { en: "", th: "", zh: "" } }])}>
              <Plus size={13} /> Add colour
            </button>
          </div>
          <div className="space-y-2">
            {v.colors.map((c, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] items-center gap-2">
                <input type="color" className="h-9 w-10 cursor-pointer rounded border border-line" value={c.hex} onChange={(e) => setColor(i, { hex: e.target.value })} aria-label="Colour" />
                <input className="input font-mono" placeholder="id" value={c.id} onChange={(e) => setColor(i, { id: e.target.value })} required />
                {LANGS.map(([lang, label]) => (
                  <input key={lang} className="input" placeholder={`Name (${label})`} value={c.name[lang] ?? ""} onChange={(e) => setColor(i, { name: { [lang]: e.target.value } })} required={lang === "en"} />
                ))}
                <button type="button" className={buttonClass("ghost", "sm")} onClick={() => set("colors", v.colors.filter((_, j) => j !== i))} disabled={v.colors.length === 1} aria-label="Remove colour">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">The first colour is the default.</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Thumbnail</h3>
            <ThumbnailUpload value={v.thumbnailUrl} itemId={v.id} onChange={(url) => set("thumbnailUrl", url)} onBusyChange={trackUpload} disabled={readOnly} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">3D model</h3>
            <ModelUpload value={v.modelUrl} itemId={v.id} onChange={(url, size) => {
                setMaterials(null);
                setV((s) => ({ ...s, modelUrl: url, ...(size ? { size: { w: size.w, d: size.d, h: size.h } } : {}) }));
              }} onBusyChange={trackUpload} disabled={readOnly} />
          </div>
        </section>

        {v.modelUrl && (
          <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Preview</h3>
              <ModelPreview
                url={v.modelUrl}
                size={v.size}
                color={v.colors[previewColor]?.hex ?? v.colors[0]?.hex ?? "#cccccc"}
                colorMaterials={colorMaterials}
                onMaterials={(names) => {
                  setMaterials(names);
                  // Forget parts that aren't in this model (e.g. after replacing the file).
                  const kept = colorMaterials.filter((n) => names.includes(n));
                  if (kept.length !== colorMaterials.length) setColorMaterials(kept);
                }}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                Preview colour:
                {v.colors.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    title={c.name.en || c.id}
                    aria-label={`Preview ${c.name.en || c.id}`}
                    onClick={() => setPreviewColor(i)}
                    className={`size-6 rounded-full border-2 ${i === previewColor ? "border-brand" : "border-line"}`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold">Parts that change colour</h3>
              <p className="mb-2 text-xs text-muted">Tick the materials that follow the colour the customer picks, e.g. fabric or paint. Unticked parts keep the look from the file.</p>
              {materials === null ? (
                <p className="text-xs text-muted">Reading the model…</p>
              ) : materials.length === 0 ? (
                <p className="text-xs text-muted">This model has no named materials, so its colour can&apos;t change. Re-export it with named materials, or upload it as .fbx, .obj or .dae so they get names.</p>
              ) : (
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                  {materials.map((name) => (
                    <label key={name} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        className="accent-brand"
                        checked={colorMaterials.includes(name)}
                        disabled={readOnly || !!paramsError}
                        onChange={(e) => setColorMaterials(e.target.checked ? [...colorMaterials, name] : colorMaterials.filter((n) => n !== name))}
                      />
                      <span className="truncate font-mono text-xs">{name}</span>
                    </label>
                  ))}
                </div>
              )}
              {materials && materials.length > 0 && (
                <div className="mt-2 flex gap-2">
                  <button type="button" className={buttonClass("ghost", "sm")} disabled={readOnly || !!paramsError} onClick={() => setColorMaterials(materials)}>Tick all</button>
                  <button type="button" className={buttonClass("ghost", "sm")} disabled={readOnly || !!paramsError} onClick={() => setColorMaterials([])}>Clear</button>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <Field label="3D template" hint="How the apps draw it until a .glb model is set">
            <input className="input font-mono" list="templates" value={v.model.template} onChange={(e) => set("model", { ...v.model, template: e.target.value })} required />
            <datalist id="templates">
              {templates.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Template parameters (JSON)" className="sm:col-span-2" hint={paramsError || 'e.g. {"shape":"sofa"} or {"doors":3}'}>
            <textarea className={`input font-mono text-xs ${paramsError ? "border-rose-400" : ""}`} rows={3} value={v.paramsText} onChange={(e) => set("paramsText", e.target.value)} />
          </Field>
        </section>
      </fieldset>
      {!readOnly && (
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <SubmitButton disabled={!!paramsError || uploads > 0}>{item ? "Save changes" : "Create item"}</SubmitButton>
          <span className="text-xs text-muted">Saving doesn&apos;t change the apps until the catalog is published.</span>
        </div>
      )}
    </form>
  );
}
