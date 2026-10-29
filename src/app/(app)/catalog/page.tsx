import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Badge, Card, LinkButton, NoAccess, PageHeader, Pagination, Table, Td, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { STATE_LABEL, STATE_TONE } from "@/lib/catalog";
import { ago, name, thb } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { AdminItem, Category, PublishState } from "@/lib/types";

export const metadata: Metadata = { title: "Catalog" };

const STATES: PublishState[] = ["new", "changed", "removing", "published", "retired"];

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const session = await getSession();
  if (!can(session, "catalog.read")) return <NoAccess what="the catalog" />;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const state = typeof sp.state === "string" ? sp.state : "";
  const page = typeof sp.page === "string" ? sp.page : "1";
  const qs = new URLSearchParams({ q, category, state, page, pageSize: "25" });
  const [list, categories] = await Promise.all([
    api<{ items: AdminItem[]; total: number; page: number; pageSize: number; publishedVersion: string; stateCounts: Partial<Record<PublishState, number>> }>(`/catalog/items?${qs}`),
    api<Category[]>("/categories"),
  ]);
  const catName = Object.fromEntries(categories.map((c) => [c.id, name(c.name)]));
  const tabHref = (s: string) => `?${new URLSearchParams({ q, category, ...(s ? { state: s } : {}) })}`;
  const pending = (list.stateCounts.new ?? 0) + (list.stateCounts.changed ?? 0) + (list.stateCounts.removing ?? 0);

  return (
    <>
      <PageHeader
        title="Catalog items"
        description={<>The apps show catalog <span className="font-mono">{list.publishedVersion || "—"}</span>. Edits here go live when you publish.</>}
        actions={
          <>
            {pending > 0 && <LinkButton href="/catalog/publish">Review {pending} unpublished change{pending > 1 ? "s" : ""}</LinkButton>}
            {can(session, "catalog.write") && (
              <LinkButton href="/catalog/new" variant="primary">
                <Plus size={15} /> New item
              </LinkButton>
            )}
          </>
        }
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <form className="flex flex-1 flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-muted" />
              <input name="q" defaultValue={q} placeholder="Search name (any language), id or SKU" className="input pl-9" />
            </div>
            <select name="category" defaultValue={category} className="input w-auto">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{name(c.name)}</option>
              ))}
            </select>
            {state && <input type="hidden" name="state" value={state} />}
            <button className={buttonClass("secondary")}>Filter</button>
          </form>
        </div>
        <div className="flex flex-wrap gap-1 border-b border-line px-4 py-2 text-sm">
          <Link href={tabHref("")} className={`rounded px-2.5 py-1 ${!state ? "bg-brand-50 font-medium text-brand" : "text-muted hover:text-ink"}`}>All</Link>
          {STATES.map((s) => (
            <Link key={s} href={tabHref(s)} className={`rounded px-2.5 py-1 ${state === s ? "bg-brand-50 font-medium text-brand" : "text-muted hover:text-ink"}`}>
              {STATE_LABEL[s]} <span className="text-xs text-muted">{list.stateCounts[s] ?? 0}</span>
            </Link>
          ))}
        </div>
        <Table head={["Item", "Category", "Price", "Colours", "Status", "Updated"]} empty="No items match.">
          {list.items.map((it) => (
            <tr key={it.id} className="hover:bg-cream/60">
              <Td>
                <Link href={`/catalog/${it.id}`} className="font-medium hover:text-brand">{name(it.name)}</Link>
                <div className="text-xs text-muted">
                  {name(it.name, "th")} · <span className="font-mono">{it.id}</span>
                  {it.sku && <> · {it.sku}</>}
                </div>
              </Td>
              <Td>
                {catName[it.category] ?? it.category}
                <div className="text-xs text-muted">{it.mount}{it.hidden && " · hidden"}</div>
              </Td>
              <Td className="tabular-nums">{thb(it.priceSatang)}</Td>
              <Td>
                <div className="flex -space-x-1">
                  {it.colors.slice(0, 6).map((c) => (
                    <span key={c.id} title={name(c.name)} className="h-4 w-4 rounded-full ring-2 ring-white" style={{ background: c.hex }} />
                  ))}
                </div>
              </Td>
              <Td><Badge tone={STATE_TONE[it.publishState]}>{STATE_LABEL[it.publishState]}</Badge></Td>
              <Td className="text-xs text-muted">{ago(it.updatedAt)}</Td>
            </tr>
          ))}
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} params={{ q, category, state }} />
      </Card>
    </>
  );
}
