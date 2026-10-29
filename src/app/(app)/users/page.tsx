import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, NoAccess, PageHeader, Pagination, Table, Td, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { ago, thb } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { Page, UserRow } from "@/lib/types";

export const metadata: Metadata = { title: "Residents" };

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const session = await getSession();
  if (!can(session, "users.read")) return <NoAccess what="resident data" />;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const erased = typeof sp.erased === "string" ? sp.erased : "";
  const list = await api<Page<UserRow>>(`/users?${new URLSearchParams({ q, page: typeof sp.page === "string" ? sp.page : "1" })}`);
  return (
    <>
      <PageHeader title="Residents" description="SmartWorld residents with saved designs. Ids come from SmartWorld accounts; names and contact details stay in SmartWorld." />
      {erased && <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">All data for <span className="font-mono">{erased}</span> was erased.</p>}
      <Card padded={false}>
        <form className="flex gap-2 border-b border-line px-4 py-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-muted" />
            <input name="q" defaultValue={q} placeholder="Resident id (starts with)" className="input pl-9 font-mono" />
          </div>
          <button className={buttonClass("secondary")}>Search</button>
        </form>
        <Table head={["Resident", "Saved designs", "Value", "Last activity"]} empty="No residents with saved designs.">
          {list.items.map((u) => (
            <tr key={u.userId} className="hover:bg-cream/60">
              <Td><Link href={`/users/${encodeURIComponent(u.userId)}`} className="font-mono text-sm font-medium hover:text-brand">{u.userId}</Link></Td>
              <Td className="tabular-nums">{u.designs}</Td>
              <Td className="tabular-nums">{thb(u.valueSatang)}</Td>
              <Td className="text-xs text-muted">{ago(u.lastActivity)}</Td>
            </tr>
          ))}
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} params={{ q }} />
      </Card>
      <p className="mt-4 text-xs text-muted">Know the id of someone without saved designs? Open <span className="font-mono">/users/&lt;id&gt;</span> directly.</p>
    </>
  );
}
