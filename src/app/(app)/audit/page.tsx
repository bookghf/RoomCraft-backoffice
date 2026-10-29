import type { Metadata } from "next";
import Link from "next/link";
import { Card, NoAccess, PageHeader, Pagination, Table, Td, buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { brief, dateTime } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { AuditEntry, Page } from "@/lib/types";

export const metadata: Metadata = { title: "Audit log" };

const TARGET_LINK: Record<string, (id: string) => string> = {
  catalogItem: (id) => `/catalog/${id}`,
  plan: (id) => `/plans/${id}`,
  design: (id) => `/designs/${id}`,
  user: (id) => `/users/${encodeURIComponent(id)}`,
};

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const session = await getSession();
  if (!can(session, "audit.read")) return <NoAccess what="the audit log" />;
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const filters = { actor: get("actor"), action: get("action"), targetType: get("targetType"), targetId: get("targetId") };
  const list = await api<Page<AuditEntry>>(`/audit?${new URLSearchParams({ ...filters, page: get("page") || "1", pageSize: "50" })}`);
  return (
    <>
      <PageHeader title="Audit log" description="Every change made in the back office, every sign-in, and every look at a resident's data." />
      <Card padded={false}>
        <form className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
          <input name="actor" defaultValue={filters.actor} placeholder="Staff email or id" className="input w-52" />
          <input name="action" defaultValue={filters.action} placeholder="Action, e.g. catalog. or user." className="input w-56 font-mono" />
          <select name="targetType" defaultValue={filters.targetType} className="input w-auto">
            <option value="">Any target</option>
            {["catalogItem", "catalogVersion", "category", "plan", "roomType", "design", "user", "share", "staff"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input name="targetId" defaultValue={filters.targetId} placeholder="Target id" className="input w-40 font-mono" />
          <button className={buttonClass("secondary")}>Filter</button>
        </form>
        <Table head={["When", "Who", "Action", "Target", "Details"]} empty="No entries match.">
          {list.items.map((e) => {
            const link = e.targetType && e.targetId && TARGET_LINK[e.targetType]?.(e.targetId);
            return (
              <tr key={e.id} className="align-top">
                <Td className="whitespace-nowrap text-xs">{dateTime(e.at)}</Td>
                <Td className="text-xs">
                  {e.actorEmail}
                  {e.ip && <div className="text-muted">{e.ip}</div>}
                </Td>
                <Td className="font-mono text-xs">{e.action}</Td>
                <Td className="text-xs">
                  {e.targetType && <span className="text-muted">{e.targetType} </span>}
                  {link ? <Link href={link} className="font-mono text-brand hover:underline">{e.targetId}</Link> : <span className="font-mono">{e.targetId}</span>}
                </Td>
                <Td className="max-w-md text-xs">
                  {e.summary}
                  {e.changes && (
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(e.changes).map(([f, c]) => (
                        <li key={f} className="break-words">
                          <span className="font-mono text-muted">{f}</span> <span className="text-rose-700 line-through">{brief(c.from)}</span> → <span className="text-emerald-700">{brief(c.to)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} params={filters} />
      </Card>
    </>
  );
}
