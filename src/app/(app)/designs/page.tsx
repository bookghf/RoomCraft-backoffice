import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge, Card, NoAccess, PageHeader, Pagination, Table, Td, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { ago, thb } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { DesignRow, Page } from "@/lib/types";

export const metadata: Metadata = { title: "Designs" };

export default async function DesignsPage({ searchParams }: PageProps<"/designs">) {
  const session = await getSession();
  if (!can(session, "designs.read")) return <NoAccess what="residents' designs" />;
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filters = { q: get("q"), owner: get("owner"), planId: get("planId"), deleted: get("deleted") };
  const qs = new URLSearchParams({ ...filters, page: get("page") || "1" });
  const list = await api<Page<DesignRow>>(`/designs?${qs}`);
  return (
    <>
      <PageHeader title="Designs" description="Saved designs from the web and phone apps. Opening one is recorded in the audit log." />
      <Card padded={false}>
        <form className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-muted" />
            <input name="q" defaultValue={filters.q} placeholder="Design name or id" className="input pl-9" />
          </div>
          <input name="owner" defaultValue={filters.owner} placeholder="Resident id" className="input w-44 font-mono" />
          <input name="planId" defaultValue={filters.planId} placeholder="Plan id" className="input w-36 font-mono" />
          <select name="deleted" defaultValue={filters.deleted} className="input w-auto">
            <option value="">Live designs</option>
            <option value="include">Include deleted</option>
            <option value="only">Deleted only</option>
          </select>
          <button className={buttonClass("secondary")}>Search</button>
        </form>
        <Table head={["Design", "Resident", "Plan", "Items", "Value", "Updated"]} empty="No designs match.">
          {list.items.map((d) => (
            <tr key={d.id} className="hover:bg-cream/60">
              <Td>
                <Link href={`/designs/${d.id}`} className="font-medium hover:text-brand">{d.name}</Link>
                <div className="font-mono text-xs text-muted">{d.id}</div>
                {d.deletedAt && <Badge tone="red">Deleted</Badge>}
              </Td>
              <Td>{can(session, "users.read") ? <Link href={`/users/${encodeURIComponent(d.ownerId)}`} className="font-mono text-xs hover:text-brand">{d.ownerId}</Link> : <span className="font-mono text-xs">{d.ownerId}</span>}</Td>
              <Td className="font-mono text-xs">{d.planId} v{d.planVersion}</Td>
              <Td className="tabular-nums">{d.itemCount}</Td>
              <Td className="tabular-nums">{thb(d.totalSatang)}</Td>
              <Td className="text-xs text-muted">{ago(d.updatedAt)}</Td>
            </tr>
          ))}
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} params={filters} />
      </Card>
    </>
  );
}
