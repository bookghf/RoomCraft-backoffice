import "server-only";
import { cache } from "react";
import { api } from "./api";
import type { Permission, Session } from "./types";

/** The signed-in staff member, fetched once per request. */
export const getSession = cache(() => api<Session>("/auth/me"));

export function can(session: Session, perm: Permission) {
  return session.permissions.includes(perm);
}
