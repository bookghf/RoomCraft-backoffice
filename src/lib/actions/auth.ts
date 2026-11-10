"use server";

import { redirect } from "next/navigation";
import { ApiError, act, api, clearSession, publicApi, setSession } from "@/lib/api";
import type { ActionState, Staff } from "@/lib/types";

interface SessionResponse {
  token: string;
  expiresAt: string;
  staff: Staff;
}

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  let res: SessionResponse;
  try {
    res = await publicApi<SessionResponse>("/auth/login", { email: form.get("email"), password: form.get("password") });
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
  await setSession(res.token, res.expiresAt);
  redirect(res.staff.mustChangePassword ? "/account?first=1" : safeNext(form.get("next")));
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const next = String(form.get("newPassword") ?? "");
  if (next !== form.get("confirmPassword")) return { error: "The new passwords don't match." };
  let res: SessionResponse | undefined;
  const state = await act(async () => {
    res = await api<SessionResponse>("/auth/password", { method: "POST", body: { currentPassword: form.get("currentPassword"), newPassword: next } });
  });
  if (!res) return state;
  // Changing the password ends every other session, so keep this one with the new token.
  await setSession(res.token, res.expiresAt);
  redirect("/?passwordChanged=1");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function logoutEverywhere() {
  await act(() => api("/auth/logout", { method: "POST" }));
  await clearSession();
  redirect("/login");
}
