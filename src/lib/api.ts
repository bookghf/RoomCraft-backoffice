import "server-only";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import type { ActionState } from "./types";

/** httpOnly cookie holding the staff token. The browser never sees the API or the token. */
export const SESSION_COOKIE = "rc_session";

const API_URL = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}

async function call<T>(path: string, init: { method?: string; body?: unknown; token?: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/admin${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, "API_UNREACHABLE", `Can't reach the RoomCraft API at ${API_URL}.`);
  }
  if (res.status === 204) return undefined as T;
  let json: Envelope<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, "BAD_RESPONSE", `The API answered ${res.status} without JSON.`);
  }
  if (!json.success) {
    const e = json.error ?? { code: "UNKNOWN", message: "Request failed." };
    throw new ApiError(res.status, e.code, e.message, e.details);
  }
  return json.data as T;
}

/** Calls the back office API as the signed-in staff member. Sends them to sign in when the session has ended. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");
  try {
    return await call<T>(path, { ...init, token });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) redirect("/login?expired=1");
      if (e.code === "PASSWORD_CHANGE_REQUIRED") redirect("/account?first=1");
    }
    throw e;
  }
}

/** Calls an API endpoint that needs no session (sign-in). */
export function publicApi<T>(path: string, body: unknown): Promise<T> {
  return call<T>(path, { method: "POST", body });
}

/** Runs a mutation for a form and turns API errors into messages the form can show. */
export async function act(fn: () => Promise<unknown>, message?: string): Promise<ActionState> {
  try {
    await fn();
    return { ok: true, message };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiError) {
      return { error: e.message, fieldErrors: fieldErrors(e.details) };
    }
    throw e;
  }
}

function fieldErrors(details: unknown): Record<string, string> | undefined {
  if (!Array.isArray(details)) return undefined;
  const out: Record<string, string> = {};
  for (const d of details) {
    if (d && typeof d.field === "string" && typeof d.message === "string") out[d.field] = d.message;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Sets the session cookie to expire with the token. */
export async function setSession(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
