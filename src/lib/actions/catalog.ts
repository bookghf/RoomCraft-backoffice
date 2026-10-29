"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { act, api } from "@/lib/api";
import type { ActionState, AdminItem } from "@/lib/types";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function saveItem(_: ActionState, form: FormData): Promise<ActionState> {
  let payload: AdminItem;
  try {
    payload = JSON.parse(str(form, "payload"));
  } catch {
    return { error: "The form could not be read. Reload and try again." };
  }
  const isNew = form.get("mode") === "create";
  let saved: AdminItem | undefined;
  const state = await act(async () => {
    saved = isNew
      ? await api<AdminItem>("/catalog/items", { method: "POST", body: payload })
      : await api<AdminItem>(`/catalog/items/${encodeURIComponent(payload.id)}`, { method: "PUT", body: payload });
  }, "Saved. Publish the catalog to send it to the apps.");
  if (saved && isNew) redirect(`/catalog/${encodeURIComponent(saved.id)}?created=1`);
  if (state.ok) refresh();
  return state;
}

export async function retireItem(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(() => api(`/catalog/items/${encodeURIComponent(str(form, "id"))}/retire`, { method: "POST" }));
  if (state.ok) refresh();
  return state;
}

export async function restoreItem(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(() => api(`/catalog/items/${encodeURIComponent(str(form, "id"))}/restore`, { method: "POST" }));
  if (state.ok) refresh();
  return state;
}

export async function publishCatalog(_: ActionState, form: FormData): Promise<ActionState> {
  const version = str(form, "version");
  const state = await act(
    () => api("/catalog/publish", { method: "POST", body: { version: version || undefined, notes: str(form, "notes") } }),
    "Published. The apps pick up the new catalog within a few minutes.",
  );
  if (state.ok) refresh();
  return state;
}

export async function rollbackCatalog(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(
    () => api(`/catalog/versions/${encodeURIComponent(str(form, "from"))}/rollback`, { method: "POST", body: {} }),
    "Rolled back and published as a new version.",
  );
  if (state.ok) refresh();
  return state;
}

export async function saveCategory(_: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const state = await act(
    () =>
      api(`/categories/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { name: { en: str(form, "en"), th: str(form, "th"), zh: str(form, "zh") }, icon: str(form, "icon"), sortOrder: Number(form.get("sortOrder") ?? 0) },
      }),
    `Category ${id} saved. It reaches the apps with the next publish.`,
  );
  if (state.ok) refresh();
  return state;
}

export async function deleteCategory(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(() => api(`/categories/${encodeURIComponent(str(form, "id"))}`, { method: "DELETE" }));
  if (state.ok) refresh();
  return state;
}
