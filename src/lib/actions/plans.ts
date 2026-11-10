"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { act, api } from "@/lib/api";
import type { ActionState, AdminPlan } from "@/lib/types";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function publishPlan(_: ActionState, form: FormData): Promise<ActionState> {
  let spec: unknown;
  try {
    spec = JSON.parse(str(form, "spec"));
  } catch {
    return { error: "The plan JSON is not valid." };
  }
  let plan: AdminPlan | undefined;
  const state = await act(async () => {
    plan = await api<AdminPlan>("/plans", {
      method: "POST",
      body: { kind: str(form, "kind"), roomType: str(form, "roomType") || undefined, spec, notes: str(form, "notes") },
    });
  });
  if (plan) redirect(`/plans/${encodeURIComponent(plan.id)}?published=${plan.version}`);
  return state;
}

export async function archivePlan(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(() => api(`/plans/${encodeURIComponent(str(form, "id"))}/archive`, { method: "POST" }));
  if (state.ok) refresh();
  return state;
}

export async function restorePlan(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(() => api(`/plans/${encodeURIComponent(str(form, "id"))}/restore`, { method: "POST" }));
  if (state.ok) refresh();
  return state;
}

export async function saveRoomType(_: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const text = (p: string) => ({ en: str(form, `${p}.en`), th: str(form, `${p}.th`), zh: str(form, `${p}.zh`) });
  const state = await act(
    () =>
      api(`/room-types/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { name: text("name"), blurb: text("blurb"), gradient: str(form, "gradient"), sortOrder: Number(form.get("sortOrder") ?? 0) },
      }),
    `Room type ${id} saved. The apps show it right away.`,
  );
  if (state.ok) refresh();
  return state;
}

export async function deleteRoomType(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(() => api(`/room-types/${encodeURIComponent(str(form, "id"))}`, { method: "DELETE" }));
  if (state.ok) refresh();
  return state;
}
