import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getSessionPayload,
  readCredentials,
  SESSION_COOKIE,
} from "@/lib/auth/credentials";

export async function getAuthState() {
  const credentials = await readCredentials();
  if (!credentials) {
    return { hasCredentials: false, isAuthenticated: false };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  const isAuthenticated = cookie
    ? Boolean(getSessionPayload(cookie, credentials))
    : false;

  return { hasCredentials: true, isAuthenticated };
}

export async function requireAuth() {
  const state = await getAuthState();
  if (!state.hasCredentials) {
    redirect("/setup");
  }
  if (!state.isAuthenticated) {
    redirect("/login");
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const state = await getAuthState();
  return state.hasCredentials && state.isAuthenticated;
}

export async function getAuthenticatedUsername(): Promise<string | null> {
  const credentials = await readCredentials();
  if (!credentials) return null;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const payload = getSessionPayload(cookie, credentials);
  return payload ? payload.u : null;
}
