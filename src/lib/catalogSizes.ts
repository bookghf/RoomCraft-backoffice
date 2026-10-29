import "server-only";
import type { CatalogItem } from "./types";

const API_URL = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");

/** The published catalog (public endpoint), used to draw items at their real size. */
export async function publishedItems(): Promise<Map<string, CatalogItem>> {
  const res = await fetch(`${API_URL}/v1/catalog`, { cache: "no-store" });
  if (!res.ok) return new Map();
  const json = await res.json();
  return new Map((json.data?.items ?? []).map((i: CatalogItem) => [i.id, i]));
}
