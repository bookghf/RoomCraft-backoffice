"use client";

import { useRef, useState } from "react";
import { edgeOf, moveWall, placeOpening, zoneSize, type Opening, type OpeningType } from "@/lib/planEdit";
import type { PlanSpec, XZ } from "@/lib/types";

export interface PreviewItem {
  key: string;
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
  mount: "floor" | "wall" | "ceiling";
  color?: string;
  label?: string;
}

const ZONE_FILL: Record<string, string> = { room: "#f4efe6", kitchen: "#eef3f1", bath: "#e6eef3", balcony: "#ebebe8" };
const OPENING_COLOR: Record<string, string> = { door: "#b07a4a", window: "#5b9bd5", slider: "#3c9d8f" };

/** Direction of the zone edge an opening sits on, so it can be drawn along the wall. */
function wallDir(spec: PlanSpec, at: XZ): XZ {
  for (const z of spec.zones) {
    for (let i = 0; i < z.polygon.length; i++) {
      const a = z.polygon[i];
      const b = z.polygon[(i + 1) % z.polygon.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!len) continue;
      const cross = (b[0] - a[0]) * (at[1] - a[1]) - (b[1] - a[1]) * (at[0] - a[0]);
      const dot = (at[0] - a[0]) * (b[0] - a[0]) + (at[1] - a[1]) * (b[1] - a[1]);
      if (Math.abs(cross / len) < 0.05 && dot >= 0 && dot <= len * len) return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    }
  }
  return [1, 0];
}

function inside(x: number, z: number, poly: XZ[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

const polyArea = (poly: XZ[]) => Math.abs(poly.reduce((s, a, i) => { const b = poly[(i + 1) % poly.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2);

/**
 * How an opening meets the floor, matching the apps: doors swing into the larger room on their wall,
 * hinged at the end with the smaller x (or z); sliders keep a 60 cm walkway on each side.
 */
function openingFloor(spec: PlanSpec, o: PlanSpec["openings"][number]) {
  let [dx, dz] = wallDir(spec, o.at);
  if (dx < -1e-6 || (Math.abs(dx) < 1e-6 && dz < 0)) [dx, dz] = [-dx, -dz];
  const n: XZ = [-dz, dx];
  const zoneOn = (sg: number) => spec.zones.find((z) => inside(o.at[0] + n[0] * sg * 0.05, o.at[1] + n[1] * sg * 0.05, z.polygon));
  const plus = zoneOn(1), minus = zoneOn(-1);
  const sign = (plus ? polyArea(plus.polygon) : -1) >= (minus ? polyArea(minus.polygon) : -1) ? 1 : -1;
  return { dir: [dx, dz] as XZ, n, sign, sides: [plus ? 1 : 0, minus ? -1 : 0].filter(Boolean) };
}

interface Box {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

interface Drag {
  zone: number;
  edge: number;
  start: XZ;
  spec: PlanSpec;
  box: Box;
}

/**
 * Top-down drawing of a plan, in metres: X to the right, Z down, like the editor's 2D view.
 * Items rotate by -rot because the apps rotate about +Y.
 * With `onChange`, every wall gets a handle that drags it in or out to resize the room,
 * and openings can be clicked to select them. With a `tool`, clicking a wall adds that opening.
 */
export default function PlanPreview({
  spec,
  items = [],
  className = "",
  onChange,
  tool = null,
  selectedOpening = null,
  onSelectOpening,
}: {
  spec: PlanSpec;
  items?: PreviewItem[];
  className?: string;
  onChange?: (spec: PlanSpec) => void;
  tool?: OpeningType | null;
  selectedOpening?: number | null;
  onSelectOpening?: (index: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ghost, setGhost] = useState<Opening | null>(null);
  const pts = spec.zones.flatMap((z) => z.polygon);
  if (!pts.length) return <div className="p-6 text-center text-sm text-muted">No zones to draw.</div>;
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  // Extra room around an editable plan so walls can be dragged outwards; the view holds still while dragging.
  const pad = onChange ? 1.5 : 0.6;
  const box: Box = drag?.box ?? { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minZ: Math.min(...zs) - pad, maxZ: Math.max(...zs) + pad };
  const { minX, maxX, minZ, maxZ } = box;
  const w = maxX - minX, h = maxZ - minZ;
  const font = Math.max(w, h) / 45;

  const toPlan = (e: React.PointerEvent): XZ | null => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  const onDown = (zone: number, edge: number) => (e: React.PointerEvent) => {
    const start = toPlan(e);
    if (!start) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag({ zone, edge, start, spec, box });
  };
  const onMove = (e: React.PointerEvent) => {
    if (tool) {
      const p = toPlan(e);
      setGhost(p ? placeOpening(spec, tool, p) : null);
      return;
    }
    if (!drag || !onChange) return;
    const p = toPlan(e);
    const ed = edgeOf(drag.spec, drag.zone, drag.edge);
    if (!p || !ed) return;
    const dist = (p[0] - drag.start[0]) * ed.n[0] + (p[1] - drag.start[1]) * ed.n[1];
    const next = moveWall(drag.spec, drag.zone, drag.edge, dist);
    if (next) onChange(next);
  };
  const onUp = () => setDrag(null);
  const onBackgroundDown = (e: React.PointerEvent) => {
    if (!onChange) return;
    if (!tool) return onSelectOpening?.(null);
    const p = toPlan(e);
    const o = p && placeOpening(spec, tool, p);
    if (!o) return;
    onChange({ ...spec, openings: [...spec.openings, o] });
    onSelectOpening?.(spec.openings.length);
    setGhost(null);
  };
  const openingLine = (o: Opening) => {
    const [dx, dz] = wallDir(spec, o.at);
    const hw = o.width / 2;
    return { x1: o.at[0] - dx * hw, y1: o.at[1] - dz * hw, x2: o.at[0] + dx * hw, y2: o.at[1] + dz * hw };
  };
  const dragged = drag ? spec.zones[drag.zone] : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`${minX} ${minZ} ${w} ${h}`}
      className={`h-auto w-full touch-none select-none ${className}`}
      role="img"
      aria-label={`Floor plan of ${spec.name.en}`}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerDown={onBackgroundDown}
      onPointerLeave={() => setGhost(null)}
      style={tool ? { cursor: ghost ? "copy" : "not-allowed" } : undefined}
    >
      <rect x={minX} y={minZ} width={w} height={h} fill="#fff" />
      {spec.zones.map((z) => (
        <polygon key={z.id} points={z.polygon.map((p) => p.join(",")).join(" ")} fill={ZONE_FILL[z.kind] ?? "#f4efe6"} stroke="#3b3a36" strokeWidth={0.1} strokeLinejoin="round" />
      ))}
      {spec.open?.map(([a, b], i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={ZONE_FILL.room} strokeWidth={0.12} />
      ))}
      {spec.fixtures.map((f) => (
        <rect key={f.id} x={f.x - f.w / 2} y={f.z - f.d / 2} width={f.w} height={f.d} fill="#d9d6cf" stroke="#9b968c" strokeWidth={0.02} transform={`rotate(${(-f.rot * 180) / Math.PI} ${f.x} ${f.z})`}>
          <title>{f.type}</title>
        </rect>
      ))}
      {items
        .slice()
        .sort((a, b) => (a.mount === "ceiling" ? 1 : 0) - (b.mount === "ceiling" ? 1 : 0))
        .map((it) => (
          <rect
            key={it.key}
            x={it.x - it.w / 2}
            y={it.z - it.d / 2}
            width={it.w}
            height={Math.max(it.d, 0.04)}
            rx={0.03}
            fill={it.mount === "ceiling" ? "none" : (it.color ?? "#2f5d50")}
            fillOpacity={it.mount === "wall" ? 0.9 : 0.75}
            stroke={it.mount === "ceiling" ? "#6b655c" : "#1f1d1a"}
            strokeOpacity={0.6}
            strokeWidth={0.02}
            strokeDasharray={it.mount === "ceiling" ? "0.06 0.04" : undefined}
            transform={`rotate(${(-it.rot * 180) / Math.PI} ${it.x} ${it.z})`}
          >
            {it.label && <title>{it.label}</title>}
          </rect>
        ))}
      {spec.openings.map((o, i) => {
        const f = openingFloor(spec, o);
        const hw = o.width / 2;
        const T = 0.06; // half wall thickness, as in the apps
        if (o.type === "door") {
          const op: XZ = [f.n[0] * f.sign, f.n[1] * f.sign];
          const h: XZ = [o.at[0] - f.dir[0] * hw + op[0] * T, o.at[1] - f.dir[1] * hw + op[1] * T];
          const r = o.width;
          const end: XZ = [h[0] + op[0] * r, h[1] + op[1] * r];
          const closed: XZ = [h[0] + f.dir[0] * r, h[1] + f.dir[1] * r];
          const sweep = f.dir[0] * op[1] - f.dir[1] * op[0] > 0 ? 0 : 1;
          return (
            <g key={`sw${i}`} style={{ pointerEvents: "none" }}>
              <path d={`M ${h[0]} ${h[1]} L ${end[0]} ${end[1]} A ${r} ${r} 0 0 ${sweep} ${closed[0]} ${closed[1]} Z`} fill="#b07a4a" fillOpacity={0.08} stroke="none" />
              <path d={`M ${end[0]} ${end[1]} A ${r} ${r} 0 0 ${sweep} ${closed[0]} ${closed[1]}`} fill="none" stroke="#b07a4a" strokeWidth={0.02} strokeDasharray="0.06 0.04" />
              <line x1={h[0]} y1={h[1]} x2={end[0]} y2={end[1]} stroke="#8a5a32" strokeWidth={0.035} />
            </g>
          );
        }
        if (o.type === "slider") {
          return (
            <g key={`sw${i}`} style={{ pointerEvents: "none" }}>
              {f.sides.map((sg) => {
                const a: XZ = [o.at[0] - f.dir[0] * hw + f.n[0] * sg * T, o.at[1] - f.dir[1] * hw + f.n[1] * sg * T];
                const b: XZ = [o.at[0] + f.dir[0] * hw + f.n[0] * sg * T, o.at[1] + f.dir[1] * hw + f.n[1] * sg * T];
                const k = 0.6 * sg;
                return <polygon key={sg} points={[a, b, [b[0] + f.n[0] * k, b[1] + f.n[1] * k], [a[0] + f.n[0] * k, a[1] + f.n[1] * k]].map((p) => p.join(",")).join(" ")} fill="#3c9d8f" fillOpacity={0.07} stroke="#3c9d8f" strokeOpacity={0.5} strokeWidth={0.015} strokeDasharray="0.06 0.04" />;
              })}
            </g>
          );
        }
        return null;
      })}
      {spec.openings.map((o, i) => {
        const [dx, dz] = wallDir(spec, o.at);
        const hw = o.width / 2;
        return (
          <line key={i} x1={o.at[0] - dx * hw} y1={o.at[1] - dz * hw} x2={o.at[0] + dx * hw} y2={o.at[1] + dz * hw} stroke={OPENING_COLOR[o.type] ?? "#999"} strokeWidth={0.14} strokeLinecap="butt">
            <title>{o.type}</title>
          </line>
        );
      })}
      {spec.zones.map((z) => {
        const cx = z.polygon.reduce((s, p) => s + p[0], 0) / z.polygon.length;
        const cz = z.polygon.reduce((s, p) => s + p[1], 0) / z.polygon.length;
        return (
          <text key={z.id} x={cx} y={cz} fontSize={font} textAnchor="middle" fill="#6b655c" style={{ pointerEvents: "none" }}>
            {z.name.en}
          </text>
        );
      })}
      {onChange &&
        !tool &&
        spec.zones.map((z, zi) =>
          z.polygon.map((_, ei) => {
            const ed = edgeOf(spec, zi, ei);
            if (!ed) return null;
            const active = drag?.zone === zi && drag.edge === ei;
            const cursor = Math.abs(ed.n[0]) > 0.9 ? "ew-resize" : Math.abs(ed.n[1]) > 0.9 ? "ns-resize" : "move";
            const mx = (ed.a[0] + ed.b[0]) / 2, mz = (ed.a[1] + ed.b[1]) / 2;
            const along: XZ = [ed.n[1], -ed.n[0]];
            const g = 0.18;
            return (
              <g key={`h-${zi}-${ei}`} className="group" style={{ cursor }} onPointerDown={onDown(zi, ei)}>
                <title>Drag to move this wall</title>
                <line x1={ed.a[0]} y1={ed.a[1]} x2={ed.b[0]} y2={ed.b[1]} stroke="transparent" strokeWidth={0.35} />
                <line x1={ed.a[0]} y1={ed.a[1]} x2={ed.b[0]} y2={ed.b[1]} stroke="#2f5d50" strokeWidth={0.1} strokeOpacity={active ? 0.9 : 0} className="group-hover:[stroke-opacity:0.5]" />
                <line x1={mx - along[0] * g} y1={mz - along[1] * g} x2={mx + along[0] * g} y2={mz + along[1] * g} stroke={active ? "#2f5d50" : "#fff"} strokeWidth={0.13} strokeLinecap="round" />
                <line x1={mx - along[0] * g} y1={mz - along[1] * g} x2={mx + along[0] * g} y2={mz + along[1] * g} stroke="#2f5d50" strokeWidth={0.06} strokeLinecap="round" />
              </g>
            );
          }),
        )}
      {onChange &&
        !tool &&
        spec.openings.map((o, i) => (
          <g
            key={`o-${i}`}
            style={{ cursor: "pointer" }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectOpening?.(i);
            }}
          >
            <title>{`${o.type} · ${o.width} m (click to edit)`}</title>
            {i === selectedOpening && <line {...openingLine(o)} stroke="#1f1d1a" strokeWidth={0.26} strokeOpacity={0.35} strokeLinecap="round" />}
            <line {...openingLine(o)} stroke="transparent" strokeWidth={0.4} />
          </g>
        ))}
      {ghost && <line {...openingLine(ghost)} stroke={OPENING_COLOR[ghost.type] ?? "#999"} strokeWidth={0.14} strokeOpacity={0.55} style={{ pointerEvents: "none" }} />}
      {dragged && (() => {
        const sz = zoneSize(dragged.polygon);
        const cx = dragged.polygon.reduce((s, p) => s + p[0], 0) / dragged.polygon.length;
        const cz = dragged.polygon.reduce((s, p) => s + p[1], 0) / dragged.polygon.length;
        return (
          <text x={cx} y={cz + font * 1.4} fontSize={font} textAnchor="middle" fill="#2f5d50" fontWeight={600} style={{ pointerEvents: "none" }}>
            {sz.w.toFixed(2)} × {sz.d.toFixed(2)} m
          </text>
        );
      })()}
      <g transform={`translate(${minX + 0.2} ${maxZ - 0.25})`}>
        <line x1={0} x2={1} y1={0} y2={0} stroke="#1f1d1a" strokeWidth={0.03} />
        <text x={0.5} y={-0.08} fontSize={font * 0.9} textAnchor="middle" fill="#1f1d1a">1 m</text>
      </g>
    </svg>
  );
}
