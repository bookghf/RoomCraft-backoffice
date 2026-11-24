"use client";

import { useMemo, useState } from "react";
import { Lightbulb, RotateCcw, Ruler, Search } from "lucide-react";
import { buttonClass } from "./ui";
import TemplatePreview from "./TemplatePreview";
import {
  FURNITURE_TYPES,
  GROUPS,
  findType,
  optionValue,
  setOption,
  unknownKeys,
  type FurnitureType,
  type ParamValue,
  type Params,
  type TemplateOption,
} from "@/lib/furnitureTypes";
import type { AdminItem, CatalogColor } from "@/lib/types";

interface Props {
  template: string;
  paramsText: string;
  /** Set when paramsText isn't a JSON object. */
  paramsError: string;
  onTemplate: (template: string, params: Params) => void;
  onTemplateText: (template: string) => void;
  onParamsText: (text: string) => void;
  /** Applies a type's typical size, placement and flags. */
  onApplyType: (type: FurnitureType) => void;
  size: { w: number; d: number; h: number };
  mount: AdminItem["mount"];
  colors: CatalogColor[];
  /** New items take a type's typical size straight away. */
  isNew: boolean;
  templates: string[];
  designerUrl: string;
}

const m = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");

/** Pick a built-in furniture type, adjust its options with real controls, and watch the result in 3D. */
export default function TemplateEditor(props: Props) {
  const { template, paramsText, paramsError, size, mount, colors, isNew } = props;
  const params = useMemo<Params>(() => {
    try {
      const p = JSON.parse(paramsText || "{}");
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }, [paramsText]);
  const type = findType(template, params);
  const [picking, setPicking] = useState(!type);
  const [query, setQuery] = useState("");
  const [colorIndex, setColorIndex] = useState(0);
  const [lightsOn, setLightsOn] = useState(false);
  const previewColor = colors[Math.min(colorIndex, colors.length - 1)]?.hex ?? "#cccccc";

  const pick = (t: FurnitureType) => {
    props.onTemplate(t.template, { ...t.fixed });
    if (isNew) props.onApplyType(t);
    setPicking(false);
    setQuery("");
  };
  const change = (o: TemplateOption, value: ParamValue | undefined) => props.onTemplate(template, setOption(params, o, value));

  const q = query.trim().toLowerCase();
  const choices = FURNITURE_TYPES.filter((t) => !t.legacy && (!q || t.label.toLowerCase().includes(q) || t.group.toLowerCase().includes(q)));
  const typical = type && (type.size.w !== size.w || type.size.d !== size.d || type.size.h !== size.h || type.mount !== mount);
  const extra = type ? unknownKeys(type, params) : [];
  const preview = useMemo(
    () => ({ template, params, size, color: previewColor, mount, glow: lightsOn ? 1 : 0 }),
    [template, params, size, previewColor, mount, lightsOn],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {/* Furniture type */}
        {type && !picking ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{type.group}</p>
              <p className="font-medium">{type.label}</p>
            </div>
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setPicking(true)}>
              Change type
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">What kind of furniture is it?</p>
              {type && (
                <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setPicking(false)}>
                  Cancel
                </button>
              )}
            </div>
            {!type && template && !paramsError && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This item uses <span className="font-mono">{template}{template === "shape" && params.shape ? `: ${String(params.shape)}` : ""}</span>, which isn&apos;t in the list below. The apps draw it as a grey box. Pick a type to fix it.
              </p>
            )}
            <label className="relative block">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-8" placeholder="Search, e.g. sofa, lamp, shelf" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {GROUPS.map((g) => {
                const list = choices.filter((t) => t.group === g);
                if (!list.length) return null;
                return (
                  <div key={g}>
                    <p className="mb-1 text-xs font-medium text-muted">{g}</p>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {list.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => pick(t)}
                          className={`rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${type?.id === t.id ? "border-brand bg-brand-50" : "border-line hover:border-brand-light hover:bg-brand-50/50"}`}
                        >
                          <span className="block font-medium leading-tight">{t.label}</span>
                          <span className="block text-[11px] text-muted">
                            {m(t.size.w)}×{m(t.size.d)}×{m(t.size.h)} m{t.mount !== "floor" ? ` · ${t.mount}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!choices.length && <p className="text-sm text-muted">Nothing matches “{query}”.</p>}
            </div>
            {isNew && <p className="text-xs text-muted">Picking a type fills in a typical size and placement. You can change them afterwards.</p>}
          </div>
        )}

        {type && (
          <>
            <div className="space-y-1 text-xs text-muted">
              <p>
                <span className="font-medium text-ink">Item colour paints:</span> {type.colorHint}. Set the colours customers can choose in Colours above.
              </p>
              {type.sizeHint && <p>{type.sizeHint}</p>}
            </div>
            {typical && (
              <button type="button" className={buttonClass("secondary", "sm")} onClick={() => props.onApplyType(type)}>
                <Ruler size={13} /> Use typical size: {m(type.size.w)} × {m(type.size.d)} × {m(type.size.h)} m{type.mount !== mount ? `, ${type.mount}` : ""}
              </button>
            )}

            {paramsError ? (
              <p className="text-xs text-rose-600">The parameters in Advanced aren&apos;t valid JSON, so the options are hidden. Fix or clear them there.</p>
            ) : type.options.length ? (
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                {type.options.map((o) => (
                  <OptionControl key={o.key} option={o} value={o.kind === "color" ? params[o.key] : optionValue(o, params)} itemColor={previewColor} onChange={(v) => change(o, v)} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">This type has no extra options. Size and colour shape it.</p>
            )}
          </>
        )}

        <details className="rounded-lg border border-line bg-white p-3 text-sm" open={!!paramsError || undefined}>
          <summary className="cursor-pointer select-none text-xs font-medium text-muted">Advanced: raw template settings</summary>
          <div className="mt-3 grid gap-3">
            <label className="block">
              <span className="label">Template name</span>
              <input className="input font-mono" list="templates" value={template} onChange={(e) => props.onTemplateText(e.target.value)} required />
              <datalist id="templates">
                {props.templates.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="label">Template parameters (JSON)</span>
              <textarea className={`input font-mono text-xs ${paramsError ? "border-rose-400" : ""}`} rows={4} value={paramsText} onChange={(e) => props.onParamsText(e.target.value)} />
              <span className={`mt-1 block text-xs ${paramsError ? "text-rose-600" : "text-muted"}`}>
                {paramsError || "The controls above write this for you. Only options you changed from their default are saved."}
              </span>
            </label>
            {extra.length > 0 && <p className="text-xs text-amber-700">Not used by {type?.label}: {extra.join(", ")}. They are kept but have no effect.</p>}
          </div>
        </details>
      </div>

      <div className="space-y-2">
        <TemplatePreview designerUrl={props.designerUrl} item={preview} />
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {colors.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span>Colour:</span>
              {colors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  title={c.name.en || c.id}
                  aria-label={`Preview in ${c.name.en || c.id}`}
                  onClick={() => setColorIndex(i)}
                  className={`size-5 rounded-full border ${i === colorIndex ? "ring-2 ring-brand ring-offset-1" : "border-line"}`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          )}
          {type?.flags?.light && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" className="accent-brand" checked={lightsOn} onChange={(e) => setLightsOn(e.target.checked)} />
              <Lightbulb size={12} /> Lights on
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionControl({ option: o, value, itemColor, onChange }: { option: TemplateOption; value: ParamValue | undefined; itemColor: string; onChange: (v: ParamValue | undefined) => void }) {
  const label = <span className="label">{o.label}</span>;
  const hint = o.hint && <span className="mt-1 block text-xs text-muted">{o.hint}</span>;
  switch (o.kind) {
    case "toggle":
      return (
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" className="accent-brand" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {o.label}
        </label>
      );
    case "select":
      return (
        <div>
          {label}
          <div role="radiogroup" aria-label={o.label} className="flex flex-wrap gap-1">
            {o.choices.map(([v, text]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={value === v}
                onClick={() => onChange(v)}
                className={`rounded-md border px-2.5 py-1.5 text-sm transition-colors ${value === v ? "border-brand bg-brand text-white" : "border-line hover:border-brand-light"}`}
              >
                {text}
              </button>
            ))}
          </div>
          {hint}
        </div>
      );
    case "count":
    case "length": {
      const step = o.kind === "count" ? 1 : o.step;
      const n = typeof value === "number" ? value : value === undefined ? undefined : Number(value);
      const bump = (dir: number) => {
        const base = n ?? (o.kind === "count" ? o.min : o.default);
        onChange(Math.min(o.max, Math.max(o.min, Math.round((base + dir * step) * 100) / 100)));
      };
      return (
        <label className="block">
          {label}
          <div className="flex items-center gap-1">
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => bump(-1)} disabled={n !== undefined && n <= o.min} aria-label={`Fewer ${o.label}`}>
              −
            </button>
            <input
              className="input w-24 text-center tabular-nums"
              type="number"
              min={o.min}
              max={o.max}
              step={step}
              value={n ?? ""}
              placeholder={o.kind === "count" ? o.autoLabel ?? "" : ""}
              onChange={(e) => onChange(e.target.value === "" ? undefined : Math.min(o.max, Math.max(o.min, Number(e.target.value))))}
            />
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => bump(1)} disabled={n !== undefined && n >= o.max} aria-label={`More ${o.label}`}>
              +
            </button>
            {o.kind === "count" && o.autoLabel && n !== undefined && (
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => onChange(undefined)} title="Back to automatic">
                <RotateCcw size={12} /> Auto
              </button>
            )}
          </div>
          {o.kind === "count" && o.autoLabel && n === undefined ? <span className="mt-1 block text-xs text-muted">{o.autoLabel}</span> : hint}
        </label>
      );
    }
    case "color": {
      const set = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
      const shown = set ? (value as string) : o.default ?? itemColor;
      const isDefault = !set;
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <input type="color" className="h-9 w-10 cursor-pointer rounded border border-line" value={shown} onChange={(e) => onChange(e.target.value)} aria-label={o.label} />
            <span className="text-xs text-muted">{isDefault ? (o.default ? "Default" : o.autoLabel ?? "Automatic") : shown}</span>
            {!isDefault && (
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => onChange(undefined)} title="Back to the default">
                <RotateCcw size={12} /> Reset
              </button>
            )}
          </div>
        </div>
      );
    }
  }
}
