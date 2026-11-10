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
 * Only the dragged zone changes: neighbouring zones keep their shape even when they share the wall.
 * Openings on the wall and open (wall-less) edges along it move with it.
 * Returns null when the move would collapse or flip a zone.
 */
export function moveWall(spec: PlanSpec, zone: number, edge: number, dist: number): PlanSpec | null {
  const e = edgeOf(spec, zone, edge);
  if (!e) return null;
  const d = Math.round(dist / SNAP) * SNAP;
  const off: XZ = [e.n[0] * d, e.n[1] * d];
  const shift = (p: XZ): XZ => [round(p[0] + off[0]), round(p[1] + off[1])];
  const moves = (p: XZ) => same(p, e.a) || same(p, e.b) || onSegment(p, e.a, e.b, EPS);

  const zones = spec.zones.map((z, i) => (i === zone ? { ...z, polygon: z.polygon.map((p) => (moves(p) ? shift(p) : p)) } : z));
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

export type OpeningType = "door" | "window" | "slider";
export type Opening = PlanSpec["openings"][number];

/** Defaults match what the apps assume when height or sill is left out. */
export const OPENING_DEFAULTS: Record<OpeningType, Omit<Opening, "at">> = {
  door: { type: "door", width: 0.9 },
  window: { type: "window", width: 1.2, sill: 0.9, height: 1.2 },
  slider: { type: "slider", width: 1.8 },
};

interface WallHit {
  a: XZ;
  b: XZ;
  len: number;
  /** Distance along the wall from a. */
  t: number;
}

/** The wall closest to p, if p is within `tol` metres of one. */
function nearestWall(spec: PlanSpec, p: XZ, tol = 0.35): WallHit | null {
  let best: (WallHit & { dist: number }) | null = null;
  for (const z of spec.zones) {
    for (let i = 0; i < z.polygon.length; i++) {
      const a = z.polygon[i];
      const b = z.polygon[(i + 1) % z.polygon.length];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      if (!len) continue;
      const t = Math.min(Math.max(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len, 0), len);
      const dist = Math.hypot(a[0] + (dx / len) * t - p[0], a[1] + (dz / len) * t - p[1]);
      if (dist <= tol && (!best || dist < best.dist)) best = { a, b, len, t, dist };
    }
  }
  return best;
}

/** Where along its wall an opening sits: [start, end] in metres from the wall's start, or null if it is on another wall. */
function spanOn(o: Opening, w: WallHit): [number, number] | null {
  const dx = (w.b[0] - w.a[0]) / w.len, dz = (w.b[1] - w.a[1]) / w.len;
  const t = (o.at[0] - w.a[0]) * dx + (o.at[1] - w.a[1]) * dz;
  const off = Math.abs((o.at[0] - w.a[0]) * -dz + (o.at[1] - w.a[1]) * dx);
  if (off > 0.05 || t < -0.05 || t > w.len + 0.05) return null;
  return [t - o.width / 2, t + o.width / 2];
}

/**
 * A new opening of `type` centred where p falls on the nearest wall, snapped to 5 cm and kept
 * inside the wall. Null when p is not near a wall, the wall is too short, or it would overlap another opening.
 */
export function placeOpening(spec: PlanSpec, type: OpeningType, p: XZ): Opening | null {
  const w = nearestWall(spec, p);
  if (!w || w.len < 0.5) return null;
  const def = OPENING_DEFAULTS[type];
  const width = round(Math.min(def.width, w.len - 0.2));
  const half = width / 2;
  const t = Math.min(Math.max(Math.round(w.t / SNAP) * SNAP, half + 0.05), w.len - half - 0.05);
  const at: XZ = [round(w.a[0] + ((w.b[0] - w.a[0]) / w.len) * t), round(w.a[1] + ((w.b[1] - w.a[1]) / w.len) * t)];
  const overlaps = spec.openings.some((o) => {
    const s = spanOn(o, w);
    return s && s[0] < t + half && s[1] > t - half;
  });
  return overlaps ? null : { ...def, width, at };
}

export function addOpening(spec: PlanSpec, o: Opening): PlanSpec {
  return { ...spec, openings: [...spec.openings, o] };
}

export function removeOpening(spec: PlanSpec, index: number): PlanSpec {
  return { ...spec, openings: spec.openings.filter((_, i) => i !== index) };
}

/** Change an opening's type or size. Switching type resets sill/height to that type's defaults. */
export function updateOpening(spec: PlanSpec, index: number, patch: Partial<Omit<Opening, "at">>): PlanSpec {
  return {
    ...spec,
    openings: spec.openings.map((o, i) => {
      if (i !== index) return o;
      if (patch.type && patch.type !== o.type) {
        const { width, at } = o;
        return { ...OPENING_DEFAULTS[patch.type as OpeningType], ...patch, width: patch.width ?? width, at };
      }
      return { ...o, ...patch };
    }),
  };
}
