"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { act, api } from "@/lib/api";
import type { ActionState } from "@/lib/types";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function revokeShare(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(() => api(`/shares/${encodeURIComponent(str(form, "code"))}/revoke`, { method: "POST" }));
  if (state.ok) refresh();
  return state;
}

/** PDPA erasure: the API also checks that the typed id matches. */
export async function deleteResident(_: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  if (str(form, "confirm") !== id) return { error: "Type the resident id exactly to confirm." };
  const state = await act(() => api(`/users/${encodeURIComponent(id)}`, { method: "DELETE", body: { confirm: id } }));
  if (state.ok) redirect(`/users?erased=${encodeURIComponent(id)}`);
  return state;
}
