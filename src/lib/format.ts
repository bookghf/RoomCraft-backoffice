import type { Text } from "./types";

const TZ = "Asia/Bangkok";

const thbFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Satang → "฿12,990" (or "฿12,990.50"). */
export function thb(satang: number) {
  return thbFmt.format(satang / 100);
}

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });

export function dateTime(iso?: string | null) {
  return iso ? dateTimeFmt.format(new Date(iso)) : "—";
}

export function date(iso?: string | null) {
  return iso ? dateFmt.format(new Date(iso)) : "—";
}

export function ago(iso?: string | null) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return date(iso);
}

/** English name, falling back to any language present. */
export function name(text?: Text | null, lang: keyof Text = "en") {
  if (!text) return "";
  return text[lang] || text.en || text.th || text.zh || "";
}

export function num(n: number) {
  return n.toLocaleString("en-US");
}

/** Shows any JSON-ish value briefly, for change lists. */
export function brief(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v === "" ? '""' : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  catalog_manager: "Catalog manager",
  support: "Support",
  viewer: "Viewer",
};
