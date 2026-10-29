import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlanPreview from "@/components/PlanPreview";
import { Badge, Card, Dl, NoAccess, PageHeader, Table, Td } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { publishedItems } from "@/lib/catalogSizes";
import { dateTime, name, thb } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { AdminPlan, Design, Quote } from "@/lib/types";

export const metadata: Metadata = { title: "Design" };

export default async function DesignPage({ params }: PageProps<"/designs/[id]">) {
  const session = await getSession();
  if (!can(session, "designs.read")) return <NoAccess what="residents' designs" />;
  const { id } = await params;
  let data: { design: Design; plan: AdminPlan | null; quote: Quote };
  try {
    data = await api(`/designs/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const { design: d, plan, quote } = data;
  const catalog = await publishedItems();
  const items = d.content.items.flatMap((it) => {
    const c = catalog.get(it.itemId);
    if (!c) return [];
    const color = c.colors.find((x) => x.id === it.colorId)?.hex ?? c.colors[0]?.hex;
    return [{ key: it.uid, x: it.x, z: it.z, rot: it.rot, w: c.size.w, d: c.size.d, mount: c.mount, color, label: name(c.name) }];
  });
  const spec = plan && d.content.size && plan.spec.resizable
    ? { ...plan.spec, zones: plan.spec.zones.map((z) => ({ ...z, polygon: [[0, 0], [d.content.size!.w, 0], [d.content.size!.w, d.content.size!.d], [0, d.content.size!.d]] as [number, number][] })) }
    : plan?.spec;

  return (
    <>
      <PageHeader
        title={d.name}
        description={<span className="font-mono">{d.id}</span>}
        back={{ href: "/designs", label: "Designs" }}
        actions={d.deletedAt ? <Badge tone="red">Deleted {dateTime(d.deletedAt)}</Badge> : <Badge tone="green">Saved</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card title="Top view" padded={false}>
          {spec ? <PlanPreview spec={spec} items={items} /> : <p className="p-6 text-sm text-muted">The plan version is missing.</p>}
        </Card>
        <Card title="Details">
          <Dl
            items={[
              ["Resident", can(session, "users.read") ? <Link key="o" href={`/users/${encodeURIComponent(d.ownerId)}`} className="font-mono text-xs text-brand hover:underline">{d.ownerId}</Link> : d.ownerId],
              ["Plan", <Link key="p" href={`/plans/${d.planId}?v=${d.planVersion}`} className="text-brand hover:underline">{plan ? name(plan.spec.name) : d.planId} v{d.planVersion}</Link>],
              ["Items", String(d.itemCount)],
              ["Floor", <span key="f" className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: d.content.floor.color }} />{d.content.floor.material}</span>],
              ["Walls", <span key="w" className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: d.content.wall.color }} />{d.content.wall.material}</span>],
              ["Ceiling", `${d.content.ceiling} m`],
              ["Saved version", `v${d.version}`],
              ["Created", dateTime(d.createdAt)],
              ["Updated", dateTime(d.updatedAt)],
            ]}
          />
        </Card>
      </div>
      <Card title={<>Shopping list at today&apos;s prices <span className="font-normal text-muted">(catalog {quote.catalogVersion})</span></>} className="mt-6" padded={false}>
        <Table head={["Item", "SKU", "Colour", "Qty", "Unit", "Total"]}>
          {quote.lines.map((l) => (
            <tr key={`${l.itemId}/${l.colorId}`}>
              <Td><Link href={`/catalog/${l.itemId}`} className="hover:text-brand">{name(l.name)}</Link></Td>
              <Td className="font-mono text-xs">{l.sku ?? "—"}</Td>
              <Td className="text-xs">{l.colorId}</Td>
              <Td className="tabular-nums">{l.quantity}</Td>
              <Td className="tabular-nums">{thb(l.unitSatang)}</Td>
              <Td className="tabular-nums">{thb(l.lineSatang)}</Td>
            </tr>
          ))}
        </Table>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
          <span className="text-muted">{quote.unavailable.length > 0 && <>Not in the catalog any more: {quote.unavailable.map((u) => `${u.itemId} ×${u.quantity}`).join(", ")}</>}</span>
          <span className="font-semibold tabular-nums">Total {thb(quote.totalSatang)}</span>
        </div>
      </Card>
    </>
  );
}
