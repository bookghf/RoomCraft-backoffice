import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Card, LinkButton, NoAccess, PageHeader, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import { date, name, thb } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { AdminPlanSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Plans & showrooms" };

const KINDS = [
  ["", "All"],
  ["unit", "Unit plans"],
  ["showroom", "Showrooms"],
  ["empty", "Empty room"],
] as const;

export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const session = await getSession();
  if (!can(session, "catalog.read")) return <NoAccess what="plans" />;
  const { kind } = await searchParams;
  const k = typeof kind === "string" ? kind : "";
  const plans = await api<AdminPlanSummary[]>(`/plans${k ? `?kind=${k}` : ""}`);
  return (
    <>
      <PageHeader
        title="Plans & showrooms"
        description="Floor plans residents start from, and furnished showrooms. Each change is a new version; saved designs keep theirs."
        actions={can(session, "plans.write") && <LinkButton href="/plans/new" variant="primary"><Plus size={15} /> New plan</LinkButton>}
      />
      <Card padded={false}>
        <div className="flex gap-1 border-b border-line px-4 py-2 text-sm">
          {KINDS.map(([v, label]) => (
            <Link key={v} href={v ? `?kind=${v}` : "?"} className={`rounded px-2.5 py-1 ${k === v ? "bg-brand-50 font-medium text-brand" : "text-muted hover:text-ink"}`}>
              {label}
            </Link>
          ))}
        </div>
        <Table head={["Plan", "Kind", "Area", "Furnished with", "Version", "Designs", "Status"]}>
          {plans.map((p) => (
            <tr key={p.id} className="hover:bg-cream/60">
              <Td>
                <div className="flex items-center gap-3">
                  {p.thumbnail && <span className="h-8 w-8 shrink-0 rounded" style={{ background: p.thumbnail }} />}
                  <div>
                    <Link href={`/plans/${p.id}`} className="font-medium hover:text-brand">{name(p.name)}</Link>
                    <div className="text-xs text-muted">{name(p.name, "th")} · <span className="font-mono">{p.id}</span></div>
                  </div>
                </div>
              </Td>
              <Td>
                <Badge tone={p.kind === "showroom" ? "brand" : "gray"}>{p.kind}</Badge>
                {p.roomType && <div className="mt-0.5 text-xs text-muted">{p.roomType}</div>}
              </Td>
              <Td className="tabular-nums">{p.area ? `${p.area} m²` : "—"}</Td>
              <Td className="text-xs">{p.kind === "showroom" ? <>{p.itemCount} items · {thb(p.presetTotalSatang)}</> : "—"}</Td>
              <Td className="text-xs">v{p.version} · {date(p.publishedAt)}</Td>
              <Td className="tabular-nums">{p.designCount}</Td>
              <Td>{p.archivedAt ? <Badge tone="gray">Archived</Badge> : <Badge tone="green">Live</Badge>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
