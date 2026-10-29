import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlanEditor from "@/components/PlanEditor";
import PlanPreview from "@/components/PlanPreview";
import { ConfirmButton } from "@/components/forms";
import { Badge, Card, Dl, LinkButton, NoAccess, PageHeader, Table, Td } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { archivePlan, restorePlan } from "@/lib/actions/plans";
import { dateTime, name } from "@/lib/format";
import { itemSizes } from "@/lib/planSizes";
import { can, getSession } from "@/lib/session";
import type { AdminPlan, RoomType } from "@/lib/types";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanPage({ params, searchParams }: PageProps<"/plans/[id]">) {
  const session = await getSession();
  if (!can(session, "catalog.read")) return <NoAccess what="plans" />;
  const { id } = await params;
  const { v, published } = await searchParams;
  let versions: AdminPlan[];
  try {
    versions = await api<AdminPlan[]>(`/plans/${encodeURIComponent(id)}/versions`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [sizes, roomTypes] = await Promise.all([itemSizes(), api<RoomType[]>("/room-types")]);
  const latest = versions[0];
  const shown = versions.find((p) => String(p.version) === v) ?? latest;
  const writable = can(session, "plans.write");
  const items = (shown.spec.showroom?.items ?? []).flatMap((it, i) => {
    const s = sizes[it.itemId];
    return s ? [{ key: String(i), x: it.x, z: it.z, rot: it.rot, w: s.w, d: s.d, mount: s.mount, color: s.color, label: it.itemId }] : [];
  });

  return (
    <>
      <PageHeader
        title={name(latest.spec.name)}
        description={<>{name(latest.spec.name, "th")} · <span className="font-mono">{latest.id}</span></>}
        back={{ href: "/plans", label: "Plans & showrooms" }}
        actions={
          <>
            <Badge tone={latest.kind === "showroom" ? "brand" : "gray"}>{latest.kind}</Badge>
            {latest.archivedAt ? <Badge tone="gray">Archived</Badge> : <Badge tone="green">Live</Badge>}
            {can(session, "designs.read") && <LinkButton href={`/designs?planId=${latest.id}`} size="sm">Designs using it</LinkButton>}
          </>
        }
      />
      {published && <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Published version {published}. New designs use it from now on.</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card title={<>Version {shown.version}{shown.version === latest.version && " (current)"}</>} padded={false}>
          <PlanPreview spec={shown.spec} items={items} />
        </Card>
        <div className="space-y-6">
          <Card title="Details">
            <Dl
              items={[
                ["Area", shown.spec.area ? `${shown.spec.area} m²` : "—"],
                ["Ceiling", `${shown.spec.ceiling} m`],
                ["Zones", shown.spec.zones.map((z) => z.name.en).join(", ")],
                ["Openings", String(shown.spec.openings.length)],
                ...(shown.spec.showroom ? ([["Furniture", `${shown.spec.showroom.items.length} items`], ["Room type", shown.roomType ?? "—"]] as [string, string][]) : []),
                ["Published", dateTime(shown.publishedAt)],
                ...(shown.notes ? ([["Notes", shown.notes]] as [string, string][]) : []),
              ]}
            />
            {writable && (
              <div className="mt-4 border-t border-line pt-4">
                {latest.archivedAt ? (
                  <ConfirmButton action={restorePlan} fields={{ id: latest.id }} confirmLabel="Confirm restore" variant="primary">Show in the apps again</ConfirmButton>
                ) : (
                  <ConfirmButton action={archivePlan} fields={{ id: latest.id }} confirmLabel="Confirm archive">Archive (hide from the apps)</ConfirmButton>
                )}
                <p className="mt-2 text-xs text-muted">Archived plans disappear from the apps&apos; lists, but saved designs still open.</p>
              </div>
            )}
          </Card>
          <Card title="Versions" padded={false}>
            <Table head={["", "Published", ""]}>
              {versions.map((p) => (
                <tr key={p.version} className={p.version === shown.version ? "bg-brand-50/60" : ""}>
                  <Td className="font-mono">v{p.version}</Td>
                  <Td className="text-xs">{dateTime(p.publishedAt)}</Td>
                  <Td className="text-right">
                    <Link href={`?v=${p.version}`} className="text-xs text-brand hover:underline">View</Link>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      </div>
      {writable && (
        <Card title="Publish a new version" className="mt-6">
          <PlanEditor kind={latest.kind} roomType={latest.roomType} spec={latest.spec} roomTypes={roomTypes.map((r) => ({ id: r.id, name: name(r.name) }))} sizes={sizes} />
        </Card>
      )}
    </>
  );
}
