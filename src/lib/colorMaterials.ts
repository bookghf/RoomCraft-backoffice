// Which parts of an uploaded .glb follow the colour the customer picks.
// Stored in the item's template parameters as "colorMaterials": "Fabric|Cushion" (material names, "|"-separated).
// The designer app reads the same parameter: keep roomcraft/src/features/designer/scene/colorMaterials.ts in step.

export const COLOR_MATERIALS_PARAM = "colorMaterials";

export function parseColorMaterials(params: Record<string, unknown> | undefined): string[] {
  const v = params?.[COLOR_MATERIALS_PARAM];
  return typeof v === "string" ? v.split("|").map((s) => s.trim()).filter(Boolean) : [];
}

/** Returns params with the colour materials set, or the key removed when the list is empty. */
export function withColorMaterials(params: Record<string, unknown>, names: string[]): Record<string, unknown> {
  const next = { ...params };
  if (names.length) next[COLOR_MATERIALS_PARAM] = names.join("|");
  else delete next[COLOR_MATERIALS_PARAM];
  return next;
}
