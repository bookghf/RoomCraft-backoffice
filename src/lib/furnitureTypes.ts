// The built-in shapes the RoomCraft apps can draw without a .glb file, and the options each one takes.
// Keep in step with roomcraft/src/features/designer/scene/{models,shapes}.tsx: an option here must be read there
// with the same key and default, or changing it has no effect.

import type { AdminItem } from "./types";

type Mount = AdminItem["mount"];
export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

interface Base {
  key: string;
  label: string;
  hint?: string;
}

/** One adjustable option, saved as model.params[key]. Options left at their default aren't saved. */
export type TemplateOption =
  | (Base & { kind: "count"; min: number; max: number; default?: number; autoLabel?: string })
  | (Base & { kind: "length"; min: number; max: number; step: number; default: number })
  | (Base & { kind: "toggle"; default: boolean })
  | (Base & { kind: "select"; choices: readonly (readonly [string, string])[]; default: string })
  | (Base & { kind: "color"; default?: string; autoLabel?: string });

export interface FurnitureType {
  id: string;
  label: string;
  group: (typeof GROUPS)[number];
  /** model.template, and params that pick this type (e.g. the "shape" template's shape). */
  template: string;
  fixed?: Params;
  /** What the item's colour paints. */
  colorHint: string;
  /** Typical size and placement, applied to new items and offered for existing ones. */
  mount: Mount;
  size: { w: number; d: number; h: number };
  mountHeight?: number;
  flags?: { surface?: boolean; stackable?: boolean; flat?: boolean; light?: boolean };
  /** What height means when it isn't obvious. */
  sizeHint?: string;
  options: TemplateOption[];
  /** Older duplicate kept so existing items still match; not offered for new picks. */
  legacy?: boolean;
}

export const GROUPS = ["Seating", "Tables and desks", "Beds", "Storage", "Lighting", "Decor", "Wall", "Ceiling"] as const;

const legs = (dflt = true): TemplateOption => ({ key: "legs", label: "Legs", kind: "toggle", default: dflt });
const accent = (label: string, dflt?: string, autoLabel = "Same as item colour"): TemplateOption => ({ key: "accent", label, kind: "color", default: dflt, autoLabel });
const METAL = "#2b2b2b";
const SHADE_FABRIC = "#f3ede2";
const lampShade: TemplateOption = { key: "shadeColor", label: "Lampshade colour", kind: "color", default: SHADE_FABRIC };
const drawerOptions = (rows: number, cols: number, legH: number, handle: "knob" | "bar"): TemplateOption[] => [
  { key: "rows", label: "Drawer rows", kind: "count", min: 1, max: 8, default: rows },
  { key: "cols", label: "Drawers per row", kind: "count", min: 1, max: 4, default: cols },
  { key: "legH", label: "Leg height (m)", kind: "length", min: 0, max: 0.5, step: 0.01, default: legH, hint: "0 for no legs" },
  { key: "handle", label: "Handles", kind: "select", choices: [["bar", "Bar"], ["knob", "Knob"]], default: handle },
  accent("Handle colour", METAL),
];

export const FURNITURE_TYPES: FurnitureType[] = [
  // Seating
  {
    id: "sofa", label: "Sofa", group: "Seating", template: "shape", fixed: { shape: "sofa" }, colorHint: "Fabric",
    mount: "floor", size: { w: 2, d: 0.9, h: 0.85 }, sizeHint: "Height is the top of the backrest.",
    options: [
      { key: "seats", label: "Seat cushions", kind: "count", min: 1, max: 6, autoLabel: "Auto (by width)" },
      { key: "arms", label: "Armrests", kind: "toggle", default: true },
      legs(),
      accent("Leg colour", "#3b2b20"),
      { key: "cushions", label: "Cushion colour", kind: "color", autoLabel: "Slightly lighter than the fabric" },
    ],
  },
  {
    id: "armchair", label: "Armchair", group: "Seating", template: "shape", fixed: { shape: "armchair" }, colorHint: "Fabric",
    mount: "floor", size: { w: 0.85, d: 0.85, h: 0.85 },
    options: [
      { key: "arms", label: "Armrests", kind: "toggle", default: true },
      legs(),
      accent("Leg colour", "#3b2b20"),
      { key: "cushions", label: "Cushion colour", kind: "color", autoLabel: "Slightly lighter than the fabric" },
    ],
  },
  {
    id: "chair", label: "Dining chair", group: "Seating", template: "shape", fixed: { shape: "chair" }, colorHint: "Seat and back",
    mount: "floor", size: { w: 0.45, d: 0.5, h: 0.85 }, sizeHint: "Height is the top of the backrest; the seat is at 45 cm.",
    options: [
      { key: "arms", label: "Armrests", kind: "toggle", default: false },
      { key: "cushion", label: "Seat cushion", kind: "toggle", default: false },
      { key: "cushionColor", label: "Cushion colour", kind: "color", autoLabel: "Linen tone" },
      accent("Leg and frame colour"),
    ],
  },
  {
    id: "officeChair", label: "Office chair", group: "Seating", template: "officeChair", colorHint: "Seat and back",
    mount: "floor", size: { w: 0.62, d: 0.62, h: 1.1 },
    options: [{ key: "arms", label: "Armrests", kind: "toggle", default: true }, accent("Base colour", METAL)],
  },
  {
    id: "stool", label: "Stool", group: "Seating", template: "stool", colorHint: "Seat", flags: { surface: true },
    mount: "floor", size: { w: 0.36, d: 0.36, h: 0.45 },
    options: [{ key: "bar", label: "Bar stool (4 legs, foot ring)", kind: "toggle", default: false }, accent("Leg colour", undefined, "Item colour (metal for bar stools)")],
  },
  { id: "bench", label: "Bench", group: "Seating", template: "bench", colorHint: "Whole bench", flags: { surface: true }, mount: "floor", size: { w: 1.2, d: 0.38, h: 0.45 }, options: [] },
  { id: "pouffe", label: "Pouffe", group: "Seating", template: "pouffe", colorHint: "Fabric", mount: "floor", size: { w: 0.5, d: 0.5, h: 0.42 }, options: [] },

  // Tables and desks
  {
    id: "table", label: "Table", group: "Tables and desks", template: "shape", fixed: { shape: "table" }, colorHint: "Top", flags: { surface: true },
    mount: "floor", size: { w: 1.2, d: 0.6, h: 0.75 },
    options: [
      { key: "form", label: "Top", kind: "select", choices: [["rect", "Rectangle"], ["round", "Round / oval"]], default: "rect" },
      { key: "base", label: "Base", kind: "select", choices: [["legs", "Four legs"], ["pedestal", "Centre pedestal"]], default: "legs" },
      accent("Leg colour"),
    ],
  },
  {
    id: "coffeeTable", label: "Coffee table", group: "Tables and desks", template: "shape", fixed: { shape: "coffee-table" }, colorHint: "Top", flags: { surface: true },
    mount: "floor", size: { w: 1, d: 0.6, h: 0.42 },
    options: [
      { key: "form", label: "Top", kind: "select", choices: [["round", "Round / oval"], ["rect", "Rectangle"]], default: "round" },
      { key: "shelf", label: "Lower shelf", kind: "toggle", default: true },
      accent("Leg colour"),
    ],
  },
  {
    id: "desk", label: "Desk", group: "Tables and desks", template: "shape", fixed: { shape: "desk" }, colorHint: "Whole desk", flags: { surface: true },
    mount: "floor", size: { w: 1.4, d: 0.65, h: 0.75 },
    options: [
      { key: "drawers", label: "Drawer unit", kind: "select", choices: [["right", "On the right"], ["left", "On the left"], ["none", "None (legs both ends)"]], default: "right" },
      { key: "drawerCount", label: "Drawers", kind: "count", min: 1, max: 5, default: 3 },
      accent("Handle colour", METAL),
    ],
  },
  {
    id: "standingDesk", label: "Standing desk", group: "Tables and desks", template: "standingDesk", colorHint: "Top", flags: { surface: true },
    mount: "floor", size: { w: 1.4, d: 0.7, h: 1.05 }, options: [accent("Frame colour", METAL)],
  },
  {
    id: "deskShelves", label: "Desk with shelves", group: "Tables and desks", template: "deskShelves", colorHint: "Whole desk",
    mount: "floor", size: { w: 1.2, d: 0.6, h: 1.45 }, sizeHint: "Height is the top shelf; the desk top is at 75 cm.",
    options: [{ key: "books", label: "Books on the shelf", kind: "toggle", default: true }],
  },
  {
    id: "dressingTable", label: "Dressing table", group: "Tables and desks", template: "dressingTable", colorHint: "Whole table",
    mount: "floor", size: { w: 1, d: 0.45, h: 1.45 }, sizeHint: "Height is the top of the mirror; the table top is at 76 cm.", options: [],
  },

  // Beds
  {
    id: "bed", label: "Bed", group: "Beds", template: "shape", fixed: { shape: "bed" }, colorHint: "Frame and headboard",
    mount: "floor", size: { w: 1.6, d: 2.05, h: 0.95 }, sizeHint: "Height is the top of the headboard.",
    options: [
      { key: "pillows", label: "Pillows", kind: "count", min: 0, max: 4, autoLabel: "Auto (1 or 2 by width)" },
      legs(),
      accent("Leg colour", undefined, "Slightly darker than the frame"),
      { key: "bedding", label: "Blanket colour", kind: "color", autoLabel: "Pale tint of the frame colour" },
    ],
  },

  // Storage
  {
    id: "wardrobe", label: "Wardrobe", group: "Storage", template: "wardrobe", colorHint: "Body and doors", flags: { surface: true },
    mount: "floor", size: { w: 1, d: 0.58, h: 2 },
    options: [
      { key: "doors", label: "Doors", kind: "count", min: 1, max: 6, default: 2 },
      { key: "sliding", label: "Sliding doors", kind: "toggle", default: false },
      { key: "mirror", label: "Mirror on the first door", kind: "toggle", default: false },
      accent("Handle colour", METAL),
    ],
  },
  {
    id: "drawers", label: "Chest of drawers", group: "Storage", template: "drawers", colorHint: "Body and drawer fronts", flags: { surface: true },
    mount: "floor", size: { w: 0.8, d: 0.45, h: 0.85 }, options: drawerOptions(3, 1, 0.1, "bar"),
  },
  {
    id: "bookcase", label: "Bookcase", group: "Storage", template: "shape", fixed: { shape: "bookcase" }, colorHint: "Frame and shelves", flags: { surface: true },
    mount: "floor", size: { w: 0.8, d: 0.3, h: 1.8 },
    options: [
      { key: "shelves", label: "Shelves", kind: "count", min: 1, max: 10, default: 5 },
      { key: "books", label: "Books", kind: "toggle", default: true },
      { key: "back", label: "Back panel", kind: "toggle", default: true },
    ],
  },
  { id: "rack", label: "Clothes rack", group: "Storage", template: "rack", colorHint: "Frame", mount: "floor", size: { w: 1, d: 0.45, h: 1.6 }, options: [] },
  // Older versions of the above, still used by some items.
  { id: "shape-wardrobe", label: "Wardrobe (simple)", group: "Storage", template: "shape", fixed: { shape: "wardrobe" }, colorHint: "Body and doors", flags: { surface: true }, mount: "floor", size: { w: 1, d: 0.58, h: 2 }, options: [accent("Handle colour", METAL)], legacy: true },
  { id: "shape-dresser", label: "Dresser (simple)", group: "Storage", template: "shape", fixed: { shape: "dresser" }, colorHint: "Body and drawer fronts", flags: { surface: true }, mount: "floor", size: { w: 1.2, d: 0.48, h: 0.8 }, options: drawerOptions(3, 2, 0.1, "knob"), legacy: true },
  { id: "shape-nightstand", label: "Nightstand (simple)", group: "Storage", template: "shape", fixed: { shape: "nightstand" }, colorHint: "Body and drawer fronts", flags: { surface: true }, mount: "floor", size: { w: 0.45, d: 0.4, h: 0.55 }, options: drawerOptions(2, 1, 0.12, "knob"), legacy: true },

  // Lighting
  { id: "floorLamp", label: "Floor lamp", group: "Lighting", template: "floorLamp", colorHint: "Base and pole", flags: { light: true }, mount: "floor", size: { w: 0.4, d: 0.4, h: 1.6 }, options: [lampShade] },
  { id: "tableLamp", label: "Table lamp", group: "Lighting", template: "tableLamp", colorHint: "Base", flags: { stackable: true, light: true }, mount: "floor", size: { w: 0.28, d: 0.28, h: 0.45 }, options: [lampShade] },
  { id: "wallLamp", label: "Wall lamp", group: "Lighting", template: "wallLamp", colorHint: "Bracket", flags: { light: true }, mount: "wall", size: { w: 0.18, d: 0.18, h: 0.3 }, mountHeight: 1.7, options: [lampShade] },
  { id: "pendant", label: "Pendant lamp", group: "Lighting", template: "pendant", colorHint: "Shade", flags: { light: true }, mount: "ceiling", size: { w: 0.4, d: 0.4, h: 0.7 }, sizeHint: "Height includes the cord.", options: [] },
  { id: "ceilingLamp", label: "Ceiling lamp", group: "Lighting", template: "ceilingLamp", colorHint: "Ring", flags: { light: true }, mount: "ceiling", size: { w: 0.45, d: 0.45, h: 0.12 }, options: [] },
  { id: "shape-floor-lamp", label: "Floor lamp (simple)", group: "Lighting", template: "shape", fixed: { shape: "floor-lamp" }, colorHint: "Base and pole", flags: { light: true }, mount: "floor", size: { w: 0.4, d: 0.4, h: 1.6 }, options: [lampShade], legacy: true },
  { id: "shape-table-lamp", label: "Table lamp (simple)", group: "Lighting", template: "shape", fixed: { shape: "table-lamp" }, colorHint: "Base", flags: { stackable: true, light: true }, mount: "floor", size: { w: 0.25, d: 0.25, h: 0.45 }, options: [lampShade], legacy: true },
  { id: "shape-pendant", label: "Pendant lamp (simple)", group: "Lighting", template: "shape", fixed: { shape: "pendant" }, colorHint: "Shade", flags: { light: true }, mount: "ceiling", size: { w: 0.4, d: 0.4, h: 0.6 }, options: [], legacy: true },

  // Decor
  {
    id: "rug", label: "Rug", group: "Decor", template: "shape", fixed: { shape: "rug" }, colorHint: "Rug", flags: { flat: true },
    mount: "floor", size: { w: 1.6, d: 2.3, h: 0.012 },
    options: [
      { key: "form", label: "Shape", kind: "select", choices: [["rect", "Rectangle"], ["round", "Round / oval"]], default: "rect" },
      { key: "border", label: "Border pattern", kind: "toggle", default: true },
      accent("Border colour", undefined, "Slightly darker than the rug"),
    ],
  },
  {
    id: "plant", label: "Plant", group: "Decor", template: "shape", fixed: { shape: "plant" }, colorHint: "Pot",
    mount: "floor", size: { w: 0.5, d: 0.5, h: 1.2 }, options: [{ key: "leaves", label: "Leaves", kind: "count", min: 3, max: 18, default: 9 }],
  },
  { id: "vase", label: "Vase", group: "Decor", template: "vase", colorHint: "Vase", flags: { stackable: true }, mount: "floor", size: { w: 0.15, d: 0.15, h: 0.3 }, options: [] },

  // Wall
  { id: "wallArt", label: "Wall art", group: "Wall", template: "shape", fixed: { shape: "wall-art" }, colorHint: "Picture", mount: "wall", size: { w: 0.7, d: 0.03, h: 0.5 }, mountHeight: 1.3, options: [accent("Frame colour", "#2f2a26")] },
  {
    id: "mirror", label: "Mirror", group: "Wall", template: "shape", fixed: { shape: "mirror" }, colorHint: "Frame", mount: "wall", size: { w: 0.6, d: 0.03, h: 0.9 }, mountHeight: 1.1,
    options: [{ key: "form", label: "Shape", kind: "select", choices: [["round", "Round / oval"], ["rect", "Rectangle"]], default: "round" }],
  },
  { id: "wallShelf", label: "Wall shelf", group: "Wall", template: "wallShelf", colorHint: "Shelf", mount: "wall", size: { w: 0.8, d: 0.22, h: 0.26 }, mountHeight: 1.4, sizeHint: "Height includes the items standing on it.", options: [{ key: "decor", label: "Books and plant on it", kind: "toggle", default: true }] },
  {
    id: "floatingShelf", label: "Thick floating shelf", group: "Wall", template: "shape", fixed: { shape: "shelf" }, colorHint: "Shelf", mount: "wall", size: { w: 0.8, d: 0.22, h: 0.04 }, mountHeight: 1.4,
    options: [{ key: "decor", label: "Books and plant on it", kind: "toggle", default: true }, accent("Bracket colour", METAL)],
  },
  {
    id: "wallCabinet", label: "Wall cabinet", group: "Wall", template: "wallCabinet", colorHint: "Body and doors", mount: "wall", size: { w: 0.8, d: 0.32, h: 0.6 }, mountHeight: 1.45,
    options: [{ key: "doors", label: "Doors", kind: "count", min: 1, max: 4, default: 2 }, accent("Handle colour", METAL)],
  },
  { id: "tv", label: "TV", group: "Wall", template: "tv", colorHint: "Bezel", mount: "wall", size: { w: 1.25, d: 0.06, h: 0.72 }, mountHeight: 1, options: [] },
  { id: "aircon", label: "Air conditioner", group: "Wall", template: "aircon", colorHint: "Casing", mount: "wall", size: { w: 0.9, d: 0.22, h: 0.3 }, mountHeight: 2.15, options: [] },

  // Ceiling
  {
    id: "fan", label: "Ceiling fan", group: "Ceiling", template: "fan", colorHint: "Motor", mount: "ceiling", size: { w: 1.2, d: 1.2, h: 0.4 },
    options: [{ key: "blades", label: "Blades", kind: "count", min: 2, max: 8, default: 4 }, accent("Blade colour")],
  },
];

/** The type an item's template and params describe, if any. */
export function findType(template: string, params: Params): FurnitureType | undefined {
  return FURNITURE_TYPES.find((t) => t.template === template && Object.entries(t.fixed ?? {}).every(([k, v]) => params[k] === v));
}

/** The value an option currently has (its default when unset). */
export function optionValue(o: TemplateOption, params: Params): ParamValue | undefined {
  return params[o.key] ?? ("default" in o ? o.default : undefined);
}

/** Params with one option changed. Defaults and "auto" are left out, so saved params only hold real choices. */
export function setOption(params: Params, o: TemplateOption, value: ParamValue | undefined): Params {
  const next = { ...params };
  if (value === undefined || value === "" || ("default" in o && value === o.default)) delete next[o.key];
  else next[o.key] = value;
  return next;
}

/** Option keys in params that the type doesn't know about (kept, but shown in Advanced). */
export function unknownKeys(type: FurnitureType, params: Params): string[] {
  const known = new Set([...Object.keys(type.fixed ?? {}), ...type.options.map((o) => o.key)]);
  return Object.keys(params).filter((k) => !known.has(k));
}
