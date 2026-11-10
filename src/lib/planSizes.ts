import "server-only";
import { publishedItems } from "./catalogSizes";
import type { PreviewItem } from "@/components/PlanPreview";

/** Item footprints for plan previews, keyed by item id. */
export async function itemSizes(): Promise<Record<string, { w: number; d: number; mount: PreviewItem["mount"]; color?: string }>> {
  const items = await publishedItems();
  return Object.fromEntries([...items.values()].map((i) => [i.id, { w: i.size.w, d: i.size.d, mount: i.mount, color: i.colors[0]?.hex }]));
}
