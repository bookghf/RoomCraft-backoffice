"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { FormMessage, SubmitButton } from "./forms";
import { buttonClass } from "./ui";
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

        <section className="grid gap-4 sm:grid-cols-4">
          <Field label="Price (THB)">
            <input className="input tabular-nums" type="number" min={0} step="0.01" value={v.priceTHB} onChange={(e) => set("priceTHB", e.target.value)} required />
          </Field>
          <Field label="SKU" hint="Optional product code">
            <input className="input font-mono" value={v.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Thumbnail URL">
            <input className="input" type="url" value={v.thumbnailUrl ?? ""} onChange={(e) => set("thumbnailUrl", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="3D model URL (.glb)">
            <input className="input" type="url" value={v.modelUrl ?? ""} onChange={(e) => set("modelUrl", e.target.value)} placeholder="https://" />
          </Field>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Size and placement</h3>
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
          <SubmitButton disabled={!!paramsError}>{item ? "Save changes" : "Create item"}</SubmitButton>
          <span className="text-xs text-muted">Saving doesn&apos;t change the apps until the catalog is published.</span>
        </div>
      )}
    </form>
  );
}
