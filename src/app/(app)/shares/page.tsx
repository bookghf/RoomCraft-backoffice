import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmButton } from "@/components/forms";
import { Badge, Card, NoAccess, PageHeader, Pagination, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import { revokeShare } from "@/lib/actions/support";
import { dateTime } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { Page, ShareRow } from "@/lib/types";

export const metadata: Metadata = { title: "Share links" };

const TONE = { active: "green", revoked: "gray", expired: "amber" } as const;
const STATUSES = ["", "active", "revoked", "expired"];

export default async function SharesPage({ searchParams }: PageProps<"/shares">) {
  const session = await getSession();
  if (!can(session, "shares.read")) return <NoAccess what="share links" />;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const owner = typeof sp.owner === "string" ? sp.owner : "";
  const list = await api<Page<ShareRow>>(`/shares?${new URLSearchParams({ status, owner, page: typeof sp.page === "string" ? sp.page : "1" })}`);
  return (
    <>
      <PageHeader title="Share links" description="Snapshots residents shared. Revoke a link to turn it off for everyone, e.g. after a complaint." />
      <Card padded={false}>
        <div className="flex gap-1 border-b border-line px-4 py-2 text-sm">
          {STATUSES.map((s) => (
            <Link key={s} href={`?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(owner ? { owner } : {}) })}`} className={`rounded px-2.5 py-1 capitalize ${status === s ? "bg-brand-50 font-medium text-brand" : "text-muted hover:text-ink"}`}>
              {s || "All"}
            </Link>
          ))}
        </div>
        <Table head={["Code", "Resident", "Plan", "Views", "Created", "Expires", "Status", ""]} empty="No share links.">
          {list.items.map((s) => (
            <tr key={s.code}>
              <Td className="font-mono text-xs">{s.code}</Td>
              <Td>{s.ownerId ? (can(session, "users.read") ? <Link href={`/users/${encodeURIComponent(s.ownerId)}`} className="font-mono text-xs hover:text-brand">{s.ownerId}</Link> : <span className="font-mono text-xs">{s.ownerId}</span>) : <span className="text-xs text-muted">Signed out</span>}</Td>
              <Td className="font-mono text-xs">{s.planId}</Td>
              <Td className="tabular-nums">{s.viewCount}</Td>
              <Td className="text-xs">{dateTime(s.createdAt)}</Td>
              <Td className="text-xs">{s.expiresAt ? dateTime(s.expiresAt) : "Never"}</Td>
              <Td><Badge tone={TONE[s.status]}>{s.status}</Badge></Td>
              <Td className="text-right">
                {s.status === "active" && can(session, "shares.revoke") && (
                  <ConfirmButton action={revokeShare} fields={{ code: s.code }} confirmLabel="Confirm revoke">Revoke</ConfirmButton>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} params={{ status, owner }} />
      </Card>
    </>
  );
}
