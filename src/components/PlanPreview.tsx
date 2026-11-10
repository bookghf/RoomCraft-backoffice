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

/**
 * Top-down drawing of a plan, in metres: X to the right, Z down, like the editor's 2D view.
 * Items rotate by -rot because the apps rotate about +Y.
 */
export default function PlanPreview({ spec, items = [], className = "" }: { spec: PlanSpec; items?: PreviewItem[]; className?: string }) {
  const pts = spec.zones.flatMap((z) => z.polygon);
  if (!pts.length) return <div className="p-6 text-center text-sm text-muted">No zones to draw.</div>;
  const xs = pts.map((p) => p[0]);
  const zs = pts.map((p) => p[1]);
  const pad = 0.6;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minZ = Math.min(...zs) - pad, maxZ = Math.max(...zs) + pad;
  const w = maxX - minX, h = maxZ - minZ;
  const font = Math.max(w, h) / 45;

  return (
    <svg viewBox={`${minX} ${minZ} ${w} ${h}`} className={`h-auto w-full ${className}`} role="img" aria-label={`Floor plan of ${spec.name.en}`}>
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
      <g transform={`translate(${minX + 0.2} ${maxZ - 0.25})`}>
        <line x1={0} x2={1} y1={0} y2={0} stroke="#1f1d1a" strokeWidth={0.03} />
        <text x={0.5} y={-0.08} fontSize={font * 0.9} textAnchor="middle" fill="#1f1d1a">1 m</text>
      </g>
    </svg>
  );
}
