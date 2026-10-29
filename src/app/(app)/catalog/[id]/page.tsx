import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ItemForm from "@/components/ItemForm";
import { ConfirmButton } from "@/components/forms";
import { Badge, Card, Dl, NoAccess, PageHeader } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { restoreItem, retireItem } from "@/lib/actions/catalog";
import { STATE_HELP, STATE_LABEL, STATE_TONE } from "@/lib/catalog";
import { brief, dateTime, name, num } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { AdminItem, Category } from "@/lib/types";

export const metadata: Metadata = { title: "Catalog item" };

export default async function ItemPage({ params, searchParams }: PageProps<"/catalog/[id]">) {
  const session = await getSession();
  if (!can(session, "catalog.read")) return <NoAccess what="the catalog" />;
  const { id } = await params;
  const { created } = await searchParams;
  let item: AdminItem;
  try {
    item = await api<AdminItem>(`/catalog/items/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [categories, all] = await Promise.all([api<Category[]>("/categories"), api<{ items: AdminItem[] }>("/catalog/items?pageSize=100")]);
  const templates = [...new Set(all.items.map((i) => i.model.template))].sort();
  const writable = can(session, "catalog.write");

  return (
    <>
      <PageHeader
        title={name(item.name)}
        description={<>{name(item.name, "th")} · {name(item.name, "zh")}</>}
        back={{ href: "/catalog", label: "Catalog" }}
        actions={<Badge tone={STATE_TONE[item.publishState]}>{STATE_LABEL[item.publishState]}</Badge>}
      />
      {created && <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Item created. Publish the catalog to send it to the apps.</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <ItemForm item={item} categories={categories} templates={templates} readOnly={!writable} />
        </Card>
        <div className="space-y-6">
          <Card title="Status">
            <p className="mb-4 text-sm text-muted">{STATE_HELP[item.publishState]}</p>
            <Dl
              items={[
                ["Used in", `${num(item.usageCount ?? 0)} saved designs`],
                ["Created", dateTime(item.createdAt)],
                ["Updated", dateTime(item.updatedAt)],
                ...(item.retiredAt ? ([["Retired", dateTime(item.retiredAt)]] as [string, string][]) : []),
              ]}
            />
            {writable && (
              <div className="mt-4 border-t border-line pt-4">
                {item.retiredAt ? (
                  <ConfirmButton action={restoreItem} fields={{ id: item.id }} confirmLabel="Confirm restore" variant="primary">
                    Restore item
                  </ConfirmButton>
                ) : (
                  <ConfirmButton action={retireItem} fields={{ id: item.id }} confirmLabel="Confirm retire">
                    Retire item
                  </ConfirmButton>
                )}
                <p className="mt-2 text-xs text-muted">Items are never deleted, so saved designs keep showing them.</p>
              </div>
            )}
          </Card>
          {item.changes && (
            <Card title="Unpublished changes">
              <ul className="space-y-2 text-sm">
                {Object.entries(item.changes).map(([field, c]) => (
                  <li key={field}>
                    <div className="font-mono text-xs text-muted">{field}</div>
                    <div className="break-words">
                      <span className="text-rose-700 line-through">{brief(c.from)}</span> → <span className="text-emerald-700">{brief(c.to)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {can(session, "audit.read") && (
            <Link href={`/audit?targetType=catalogItem&targetId=${encodeURIComponent(item.id)}`} className="block text-sm text-brand hover:underline">
              View change history →
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
