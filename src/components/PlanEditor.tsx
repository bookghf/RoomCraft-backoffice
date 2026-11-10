"use client";

import { useActionState, useMemo, useState } from "react";
import PlanPreview, { type PreviewItem } from "./PlanPreview";
import { FormMessage, SubmitButton } from "./forms";
import { buttonClass } from "./ui";
import { publishPlan } from "@/lib/actions/plans";
import { removeOpening, updateOpening, type OpeningType } from "@/lib/planEdit";
import type { PlanKind, PlanSpec } from "@/lib/types";

/** Edit a plan as JSON with a live 2D preview, then publish it as a new version. */
export default function PlanEditor({ kind, roomType, spec, roomTypes, sizes, isNew }: {
  kind: PlanKind;
  roomType?: string;
  spec: PlanSpec;
  roomTypes: { id: string; name: string }[];
  sizes: Record<string, { w: number; d: number; mount: PreviewItem["mount"]; color?: string }>;
  isNew?: boolean;
}) {
  const [state, action] = useActionState(publishPlan, {});
  const [text, setText] = useState(() => JSON.stringify(spec, null, 2));
  const [k, setK] = useState<PlanKind>(kind);
  const [tool, setTool] = useState<OpeningType | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const parsed = useMemo((): { spec?: PlanSpec; error?: string } => {
    try {
      const s = JSON.parse(text) as PlanSpec;
      if (!s || !Array.isArray(s.zones)) return { error: "Needs a zones array." };
      return { spec: { ...s, openings: s.openings ?? [], fixtures: s.fixtures ?? [] } };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [text]);
  const edit = (next: PlanSpec) => setText(JSON.stringify(next, null, 2));
  const sel = selected !== null ? parsed.spec?.openings[selected] : undefined;
  const items: PreviewItem[] = (parsed.spec?.showroom?.items ?? []).flatMap((it, i) => {
    const s = sizes[it.itemId];
    return s ? [{ key: String(i), x: it.x, z: it.z, rot: it.rot, w: s.w, d: s.d, mount: s.mount, color: s.color, label: it.itemId }] : [];
  });

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Kind</span>
          <select name="kind" className="input" value={k} onChange={(e) => setK(e.target.value as PlanKind)} disabled={!isNew}>
            <option value="unit">Unit floor plan</option>
            <option value="showroom">Showroom</option>
            <option value="empty">Empty room</option>
          </select>
          {!isNew && <input type="hidden" name="kind" value={k} />}
        </label>
        {k === "showroom" && (
          <label className="block">
            <span className="label">Room type</span>
            <select name="roomType" className="input" defaultValue={roomType}>
              {roomTypes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block sm:col-span-1">
          <span className="label">Version notes</span>
          <input name="notes" className="input" placeholder="e.g. Matches the 2026 sales drawing" />
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="label">Plan JSON (metres; X right, Z down)</span>
          <textarea
            name="spec"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className={`input h-[460px] font-mono text-xs leading-relaxed ${parsed.error ? "border-rose-400" : ""}`}
          />
          {parsed.error && <span className="mt-1 block text-xs text-rose-700">{parsed.error}</span>}
        </label>
        <div>
          <span className="label">Preview · drag a wall to resize the room</span>
          {parsed.spec && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-muted">Add:</span>
              {(["door", "window", "slider"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={buttonClass(tool === t ? "primary" : "secondary", "sm")}
                  aria-pressed={tool === t}
                  onClick={() => {
                    setTool(tool === t ? null : t);
                    setSelected(null);
                  }}
                >
                  <span className="inline-block size-2 rounded-full" style={{ background: OPENING_DOT[t] }} />
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
              <span className="ml-1 text-xs text-muted">{tool ? `Click a wall to place a ${tool}.` : "Click a door or window to edit or remove it."}</span>
            </div>
          )}
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            {parsed.spec ? (
              <PlanPreview spec={parsed.spec} items={items} onChange={edit} tool={tool} selectedOpening={sel ? selected : null} onSelectOpening={setSelected} />
            ) : (
              <div className="p-10 text-center text-sm text-muted">Fix the JSON to see the plan.</div>
            )}
          </div>
          {parsed.spec && sel && selected !== null && (
            <div className="mt-2 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-cream/50 p-3">
              <label className="block">
                <span className="label">Type</span>
                <select className="input py-1" value={sel.type} onChange={(e) => edit(updateOpening(parsed.spec!, selected, { type: e.target.value }))}>
                  <option value="door">Door</option>
                  <option value="window">Window</option>
                  <option value="slider">Slider</option>
                </select>
              </label>
              <NumberField label="Width (m)" value={sel.width} min={0.3} onChange={(v) => edit(updateOpening(parsed.spec!, selected, { width: v }))} />
              {sel.type === "window" && (
                <>
                  <NumberField label="Sill (m)" value={sel.sill ?? 0.9} min={0} onChange={(v) => edit(updateOpening(parsed.spec!, selected, { sill: v }))} />
                  <NumberField label="Height (m)" value={sel.height ?? 1.2} min={0.2} onChange={(v) => edit(updateOpening(parsed.spec!, selected, { height: v }))} />
                </>
              )}
              <button
                type="button"
                className={`${buttonClass("danger", "sm")} ml-auto`}
                onClick={() => {
                  edit(removeOpening(parsed.spec!, selected));
                  setSelected(null);
                }}
              >
                Remove {sel.type}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <SubmitButton disabled={!!parsed.error}>{isNew ? "Publish plan" : "Publish as a new version"}</SubmitButton>
        <span className="text-xs text-muted">Older versions stay as they are, so saved designs keep their walls.</span>
      </div>
    </form>
  );
}

const OPENING_DOT: Record<OpeningType, string> = { door: "#b07a4a", window: "#5b9bd5", slider: "#3c9d8f" };

function NumberField({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <label className="block w-24">
      <span className="label">{label}</span>
      <input
        type="number"
        step={0.05}
        min={min}
        className="input py-1"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v) && v >= min) onChange(Math.round(v * 100) / 100);
        }}
      />
    </label>
  );
}
