import Link from "next/link";
import { Badge, Card, LinkButton, NoAccess, PageHeader, Stat, Table, Td } from "@/components/ui";
import BarChart from "@/components/BarChart";
import { api } from "@/lib/api";
import { ago, name, num, thb } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { Dashboard } from "@/lib/types";

const RANGES = [7, 30, 90];

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const session = await getSession();
  if (!can(session, "dashboard.read")) return <NoAccess what="the dashboard" />;
  const { days: daysParam, passwordChanged } = await searchParams;
  const days = RANGES.includes(Number(daysParam)) ? Number(daysParam) : 30;
  const d = await api<Dashboard>(`/dashboard?days=${days}`);
  const t = d.totals;
  return (
    <>
      <PageHeader
        title={`Hello, ${session.staff.name.split(" ")[0]}`}
        description={`Activity from ${d.range.from} to ${d.range.to} (Bangkok time).`}
        actions={
          <div className="flex rounded-md border border-line bg-white p-0.5 text-sm">
            {RANGES.map((r) => (
              <Link key={r} href={`/?days=${r}`} className={`rounded px-3 py-1 ${r === days ? "bg-brand text-white" : "text-muted hover:text-ink"}`}>
                {r} days
              </Link>
            ))}
          </div>
        }
      />
      {passwordChanged && <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Password changed.</p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Saved designs" value={num(t.designs)} hint={`+${num(t.designsInRange)} in ${days} days`} />
        <Stat label="Residents" value={num(t.users)} hint={`${num(t.activeUsers)} active in ${days} days`} />
        <Stat label="Furniture in designs" value={thb(t.designValueSatang)} hint="Total at save-time prices" />
        <Stat label="Share links" value={num(t.activeShares)} hint={`${num(t.sharesInRange)} created in ${days} days`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title="New designs per day" className="lg:col-span-2">
          <BarChart data={d.perDay.map((p) => ({ date: p.date, value: p.designs }))} label="New designs per day" />
        </Card>
        <Card title="Catalog">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Live version</span><span className="font-mono">{d.catalog.version}</span></div>
            <div className="flex justify-between"><span className="text-muted">Published</span><span>{ago(d.catalog.publishedAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Items in the apps</span><span>{num(d.catalog.items)}</span></div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Unpublished changes</span>
              {d.catalog.pendingChanges ? <Badge tone="amber">{d.catalog.pendingChanges}</Badge> : <Badge tone="green">None</Badge>}
            </div>
            {d.catalog.pendingChanges > 0 && can(session, "catalog.publish") && (
              <LinkButton href="/catalog/publish" variant="primary" size="sm">Review and publish</LinkButton>
            )}
            <div className="flex justify-between border-t border-line pt-3"><span className="text-muted">Unsaved drafts (Recent)</span><span>{num(t.drafts)}</span></div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Most placed items" padded={false}>
          <Table head={["Item", "Placed", "In designs"]} empty="No designs yet.">
            {d.topItems.map((i) => (
              <tr key={i.itemId}>
                <Td>
                  <Link href={`/catalog/${i.itemId}`} className="font-medium hover:text-brand">{name(i.name) || i.itemId}</Link>
                  <div className="text-xs text-muted">{i.itemId}</div>
                </Td>
                <Td className="tabular-nums">{num(i.placements)}</Td>
                <Td className="tabular-nums">{num(i.designs)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Most used plans" padded={false}>
          <Table head={["Plan", "Kind", "Designs"]} empty="No designs yet.">
            {d.topPlans.map((p) => (
              <tr key={p.planId}>
                <Td>
                  <Link href={`/plans/${p.planId}`} className="font-medium hover:text-brand">{name(p.name) || p.planId}</Link>
                </Td>
                <Td><Badge>{p.kind ?? "?"}</Badge></Td>
                <Td className="tabular-nums">{num(p.designs)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
