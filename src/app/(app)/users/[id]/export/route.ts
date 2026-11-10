import { api } from "@/lib/api";

/** Downloads everything stored about a resident as JSON (PDPA access request). The API logs it. */
export async function GET(_req: Request, ctx: RouteContext<"/users/[id]/export">) {
  const { id } = await ctx.params;
  const data = await api(`/users/${encodeURIComponent(id)}/export`);
  const file = `roomcraft-resident-${id.replace(/[^A-Za-z0-9_-]/g, "_")}-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
