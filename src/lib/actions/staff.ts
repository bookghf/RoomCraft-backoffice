"use server";

import { refresh } from "next/cache";
import { act, api } from "@/lib/api";
import type { ActionState } from "@/lib/types";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createStaff(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(
    () => api("/staff", { method: "POST", body: { email: str(form, "email"), name: str(form, "name"), role: str(form, "role"), password: String(form.get("password") ?? "") } }),
    "Account created. Share the temporary password privately; they must change it at first sign-in.",
  );
  if (state.ok) refresh();
  return state;
}

export async function updateStaff(_: ActionState, form: FormData): Promise<ActionState> {
  const body: Record<string, unknown> = {};
  if (form.has("role")) body.role = str(form, "role");
  if (form.has("disabled")) body.disabled = form.get("disabled") === "true";
  const state = await act(() => api(`/staff/${encodeURIComponent(str(form, "id"))}`, { method: "PATCH", body }), "Saved.");
  if (state.ok) refresh();
  return state;
}

export async function resetStaffPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const state = await act(
    () => api(`/staff/${encodeURIComponent(str(form, "id"))}/reset-password`, { method: "POST", body: { password: String(form.get("password") ?? "") } }),
    "Password reset. They are signed out and must change it at next sign-in.",
  );
  if (state.ok) refresh();
  return state;
}
