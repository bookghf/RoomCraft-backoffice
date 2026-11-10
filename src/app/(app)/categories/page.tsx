import type { Metadata } from "next";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Card, NoAccess, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { deleteCategory, saveCategory } from "@/lib/actions/catalog";
import { can, getSession } from "@/lib/session";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Categories" };

function CategoryFields({ c, isNew }: { c?: Category; isNew?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr_1fr_6rem_5rem_auto] sm:items-end">
      <div>
        <label className="label">Id</label>
        {isNew ? <input name="id" className="input font-mono" required pattern="[A-Za-z0-9_\-]{1,64}" /> : <><input type="hidden" name="id" value={c!.id} /><div className="py-2 font-mono text-sm">{c!.id}</div></>}
      </div>
      {(["en", "th", "zh"] as const).map((l) => (
        <div key={l}>
          <label className="label">Name ({l})</label>
          <input name={l} defaultValue={c?.name[l] ?? ""} className="input" required />
        </div>
      ))}
      <div>
        <label className="label">Icon</label>
        <input name="icon" defaultValue={c?.icon ?? ""} className="input" placeholder="key" />
      </div>
      <div>
        <label className="label">Order</label>
        <input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 99} className="input" />
      </div>
      <SubmitButton variant={isNew ? "primary" : "secondary"}>{isNew ? "Add" : "Save"}</SubmitButton>
    </div>
  );
}

export default async function CategoriesPage() {
  const session = await getSession();
  if (!can(session, "catalog.read")) return <NoAccess what="categories" />;
  const categories = await api<Category[]>("/categories");
  const writable = can(session, "catalog.write");
  return (
    <>
      <PageHeader title="Categories" description="The tabs of the catalog picker in the apps. Changes go live with the next catalog publish." />
      <div className="space-y-4">
        {categories.map((c) => (
          <Card key={c.id}>
            {writable ? (
              <>
                <ActionForm action={saveCategory} className="space-y-3">
                  <CategoryFields c={c} />
                </ActionForm>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                  <span>{c.itemCount} live items</span>
                  {c.itemCount === 0 && (
                    <ConfirmButton action={deleteCategory} fields={{ id: c.id }} confirmLabel="Confirm delete">
                      Delete
                    </ConfirmButton>
                  )}
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span>
                  <span className="font-medium">{c.name.en}</span> · {c.name.th} · {c.name.zh} <span className="font-mono text-xs text-muted">{c.id}</span>
                </span>
                <span className="text-muted">{c.itemCount} items</span>
              </div>
            )}
          </Card>
        ))}
        {writable && (
          <Card title="Add a category">
            <ActionForm action={saveCategory} className="space-y-3" resetOnSuccess>
              <CategoryFields isNew />
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
