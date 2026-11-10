import type { Metadata } from "next";
import ItemForm from "@/components/ItemForm";
import { Card, NoAccess, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { can, getSession } from "@/lib/session";
import type { AdminItem, Category } from "@/lib/types";

export const metadata: Metadata = { title: "New item" };

export default async function NewItemPage() {
  const session = await getSession();
  if (!can(session, "catalog.write")) return <NoAccess what="catalog editing" />;
  const [categories, items] = await Promise.all([api<Category[]>("/categories"), api<{ items: AdminItem[] }>("/catalog/items?pageSize=100")]);
  const templates = [...new Set(items.items.map((i) => i.model.template))].sort();
  return (
    <>
      <PageHeader title="New catalog item" back={{ href: "/catalog", label: "Catalog" }} />
      <Card>
        <ItemForm categories={categories} templates={templates} />
      </Card>
    </>
  );
}
