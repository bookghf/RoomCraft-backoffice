import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Badge, Card, NoAccess, PageHeader, Table, Td } from "@/components/ui";
import { api } from "@/lib/api";
import { publishCatalog, rollbackCatalog } from "@/lib/actions/catalog";
import { brief, dateTime, name } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { CatalogChanges, CatalogVersionSummary } from "@/lib/types";

export const metadata: Metadata = { title: "Publish catalog" };

function ItemList({ title, tone, items }: { title: string; tone: "blue" | "amber" | "red"; items: { id: string; name: Record<string, string | undefined>; changes?: Record<string, { from: unknown; to: unknown }> }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Badge tone={tone}>{items.length}</Badge> {title}
      </div>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {items.map((it) => (
          <li key={it.id} className="px-3 py-2 text-sm">
            <Link href={`/catalog/${it.id}`} className="font-medium hover:text-brand">{name(it.name)}</Link> <span className="font-mono text-xs text-muted">{it.id}</span>
            {it.changes && (
              <div className="mt-1 space-y-0.5 text-xs">
                {Object.entries(it.changes).map(([f, c]) => (
                  <div key={f} className="break-words">
                    <span className="font-mono text-muted">{f}</span> <span className="text-rose-700 line-through">{brief(c.from)}</span> → <span className="text-emerald-700">{brief(c.to)}</span>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PublishPage() {
  const session = await getSession();
  if (!can(session, "catalog.read")) return <NoAccess what="the catalog" />;
  const [changes, versions] = await Promise.all([api<CatalogChanges>("/catalog/changes"), api<CatalogVersionSummary[]>("/catalog/versions")]);
  const canPublish = can(session, "catalog.publish");
  const live = versions[0]?.version;

  return (
    <>
      <PageHeader title="Publish catalog" description="The apps only see published versions. Each publish is kept, so you can roll back." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card title={<>Changes since <span className="font-mono">{changes.publishedVersion || "the start"}</span></>}>
          {changes.hasChanges ? (
            <div className="space-y-5">
              <ItemList title="New items" tone="blue" items={changes.added} />
              <ItemList title="Changed items" tone="amber" items={changes.changed} />
              <ItemList title="Leaving the apps (retired)" tone="red" items={changes.removed} />
              {changes.categoriesChanged.length > 0 && (
                <div className="text-sm">
                  <Badge tone="amber">{changes.categoriesChanged.length}</Badge> Categories changed: <span className="font-mono text-xs">{changes.categoriesChanged.join(", ")}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing to publish. The apps already have the latest catalog.</p>
          )}
        </Card>
        <Card title="Publish">
          {canPublish ? (
            <ActionForm action={publishCatalog} resetOnSuccess>
              <div>
                <label className="label" htmlFor="version">Version name</label>
                <input id="version" name="version" className="input font-mono" placeholder="Automatic (date and time)" />
              </div>
              <div>
                <label className="label" htmlFor="notes">Notes</label>
                <textarea id="notes" name="notes" rows={3} maxLength={500} className="input" placeholder="What changed and why" />
              </div>
              <SubmitButton disabled={!changes.hasChanges}>Publish to the apps</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">Your role can&apos;t publish. A catalog manager or owner can.</p>
          )}
        </Card>
      </div>

      <Card title="History" className="mt-6" padded={false}>
        <Table head={["Version", "Published", "Items", "Notes", ""]}>
          {versions.map((v) => (
            <tr key={v.version}>
              <Td>
                <span className="font-mono">{v.version}</span> {v.version === live && <Badge tone="green">Live</Badge>}
                {v.rolledBackFrom && <div className="text-xs text-muted">Rollback to {v.rolledBackFrom}</div>}
              </Td>
              <Td className="text-xs">{dateTime(v.publishedAt)}</Td>
              <Td className="tabular-nums">{v.itemCount}</Td>
              <Td className="max-w-xs text-xs text-muted">{v.notes}</Td>
              <Td className="text-right">
                {canPublish && v.version !== live && (
                  <ConfirmButton action={rollbackCatalog} fields={{ from: v.version }} confirmLabel="Confirm: roll back">
                    Roll back to this
                  </ConfirmButton>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
