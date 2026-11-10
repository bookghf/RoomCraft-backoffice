"use client";

import { useActionState, useMemo, useState } from "react";
import PlanPreview, { type PreviewItem } from "./PlanPreview";
import { FormMessage, SubmitButton } from "./forms";
import { publishPlan } from "@/lib/actions/plans";
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
  const parsed = useMemo((): { spec?: PlanSpec; error?: string } => {
    try {
      const s = JSON.parse(text) as PlanSpec;
      if (!s || !Array.isArray(s.zones)) return { error: "Needs a zones array." };
      return { spec: { ...s, openings: s.openings ?? [], fixtures: s.fixtures ?? [] } };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [text]);
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
          <span className="label">Preview</span>
          <div className="overflow-hidden rounded-lg border border-line bg-white">{parsed.spec ? <PlanPreview spec={parsed.spec} items={items} /> : <div className="p-10 text-center text-sm text-muted">Fix the JSON to see the plan.</div>}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <SubmitButton disabled={!!parsed.error}>{isNew ? "Publish plan" : "Publish as a new version"}</SubmitButton>
        <span className="text-xs text-muted">Older versions stay as they are, so saved designs keep their walls.</span>
      </div>
    </form>
  );
}
