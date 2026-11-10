import type { PlanSpec, XZ } from "./types";

const EPS = 1e-3;
const SNAP = 0.05;
const MIN_AREA = 0.25;

const same = (a: XZ, b: XZ) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS;
const round = (v: number) => Math.round(v * 100) / 100;

export function polygonArea(poly: XZ[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

/** Unit normal of a zone edge, and its two end points. */
export function edgeOf(spec: PlanSpec, zone: number, edge: number): { a: XZ; b: XZ; n: XZ } | null {
  const poly = spec.zones[zone]?.polygon;
  if (!poly) return null;
  const a = poly[edge];
  const b = poly[(edge + 1) % poly.length];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!a || !b || !len) return null;
  return { a, b, n: [-(b[1] - a[1]) / len, (b[0] - a[0]) / len] };
}

/** Is point p on segment a–b (within tol metres)? */
function onSegment(p: XZ, a: XZ, b: XZ, tol = 0.05) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  if (!len2) return false;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2;
  if (t < -0.01 || t > 1.01) return false;
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dz - p[1]) < tol;
}

/**
 * Move one wall (a zone edge) along its normal by `dist` metres, snapped to 5 cm.
 * Corners on the wall (in any zone), openings on the wall and open (wall-less) edges move with it.
 * Returns null when the move would collapse or flip a zone.
 */
export function moveWall(spec: PlanSpec, zone: number, edge: number, dist: number): PlanSpec | null {
  const e = edgeOf(spec, zone, edge);
  if (!e) return null;
  const d = Math.round(dist / SNAP) * SNAP;
  const off: XZ = [e.n[0] * d, e.n[1] * d];
  const shift = (p: XZ): XZ => [round(p[0] + off[0]), round(p[1] + off[1])];
  // Any corner on the wall moves, so a neighbouring zone that shares the wall keeps its shape.
  const moves = (p: XZ) => same(p, e.a) || same(p, e.b) || onSegment(p, e.a, e.b, EPS);

  const zones = spec.zones.map((z) => ({ ...z, polygon: z.polygon.map((p) => (moves(p) ? shift(p) : p)) }));
  for (let i = 0; i < zones.length; i++) {
    const before = polygonArea(spec.zones[i].polygon);
    const after = polygonArea(zones[i].polygon);
    if (Math.abs(after) < MIN_AREA || Math.sign(after) !== Math.sign(before)) return null;
  }

  const next: PlanSpec = {
    ...spec,
    zones,
    openings: spec.openings.map((o) => (onSegment(o.at, e.a, e.b) ? { ...o, at: shift(o.at) } : o)),
    open: spec.open?.map(([p, q]) => [moves(p) ? shift(p) : p, moves(q) ? shift(q) : q] as [XZ, XZ]),
  };
  if (spec.area != null) next.area = Math.round(zones.reduce((s, z) => s + Math.abs(polygonArea(z.polygon)), 0) * 10) / 10;
  if (spec.resizable) {
    const pts = zones.flatMap((z) => z.polygon);
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    next.resizable = { w: round(Math.max(...xs) - Math.min(...xs)), d: round(Math.max(...zs) - Math.min(...zs)) };
  }
  return next;
}

/** Width × depth of a zone's bounding box, in metres. */
export function zoneSize(poly: XZ[]): { w: number; d: number } {
  const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
  return { w: round(Math.max(...xs) - Math.min(...xs)), d: round(Math.max(...zs) - Math.min(...zs)) };
}
