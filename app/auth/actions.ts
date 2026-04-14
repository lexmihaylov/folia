"use server";

import { cookies } from "next/headers";

import {
  createCredentials,
  createSessionCookie,
  readCredentials,
  verifyPassword,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/credentials";
import { getAuthState, getAuthenticatedUsername } from "@/lib/auth/guard";
import {
  createVaultCredentials,
  createVaultSessionCookie,
  getVaultSessionKey,
  readVaultCredentials,
  VAULT_SESSION_COOKIE,
  VAULT_SESSION_TTL_MS,
  verifyVaultPassphrase,
} from "@/lib/vault";
import { setCollapsedState, setThemePreference } from "@/lib/auth/user-data";

type ActionResult = { ok: true } | { ok: false; error: string };

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

function validateUsername(username: string): string | null {
  if (!USERNAME_RE.test(username)) {
    return "Username must be 3-32 characters (letters, numbers, _ or -).";
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

function validateVaultPassphrase(passphrase: string): string | null {
  if (passphrase.length < 10) {
    return "Vault passphrase must be at least 10 characters.";
  }
  return null;
}

const SESSION_COOKIE_SECURE =
  process.env.FOLIA_COOKIE_SECURE?.toLowerCase() === "true";

async function setSessionCookie(value: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: SESSION_COOKIE_SECURE,
  });
}

export async function createCredentialsAction(
  username: string,
  password: string,
  vaultPassphrase: string,
): Promise<ActionResult> {
  const existing = await readCredentials();
  if (existing) {
    return { ok: false, error: "Credentials already exist." };
  }
  const normalized = username.trim();
  const usernameError = validateUsername(normalized);
  if (usernameError) return { ok: false, error: usernameError };
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };
  const vaultError = validateVaultPassphrase(vaultPassphrase);
  if (vaultError) return { ok: false, error: vaultError };

  const credentials = await createCredentials(normalized, password);
  const vault = await createVaultCredentials(vaultPassphrase);
  const session = createSessionCookie(credentials);
  const masterKey = await verifyVaultPassphrase(vault, vaultPassphrase);
  if (!masterKey) {
    return { ok: false, error: "Unable to initialize vault." };
  }
  await setSessionCookie(session);
  await setVaultSessionCookie(createVaultSessionCookie(vault, masterKey));
  return { ok: true };
}

export async function loginAction(
  username: string,
  password: string,
): Promise<ActionResult> {
  const credentials = await readCredentials();
  if (!credentials) {
    return { ok: false, error: "No credentials found. Create an account." };
  }
  const normalized = username.trim();
  const usernameError = validateUsername(normalized);
  if (usernameError) return { ok: false, error: usernameError };
  if (!password) return { ok: false, error: "Password is required." };

  const ok = await verifyPassword(credentials, normalized, password);
  if (!ok) {
    return { ok: false, error: "Invalid username or password." };
  }

  const session = createSessionCookie(credentials);
  await setSessionCookie(session);
  return { ok: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: SESSION_COOKIE_SECURE,
  });
  cookieStore.set(VAULT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: SESSION_COOKIE_SECURE,
  });
}

export async function getAuthStateAction() {
  return getAuthState();
}

export async function updateCollapsedStateAction(collapsed: string[]) {
  const username = await getAuthenticatedUsername();
  if (!username) {
    return { ok: false, error: "unauthorized" } as const;
  }
  const normalized = collapsed.filter((item) => typeof item === "string");
  await setCollapsedState(username, normalized);
  return { ok: true } as const;
}

export async function updateThemePreferenceAction(theme: string) {
  const username = await getAuthenticatedUsername();
  if (!username) {
    return { ok: false, error: "unauthorized" } as const;
  }
  if (theme !== "light" && theme !== "dark") {
    return { ok: false, error: "invalid-theme" } as const;
  }
  await setThemePreference(username, theme);
  return { ok: true } as const;
}

async function setVaultSessionCookie(value: string) {
  const cookieStore = await cookies();
  cookieStore.set(VAULT_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(VAULT_SESSION_TTL_MS / 1000),
    secure: SESSION_COOKIE_SECURE,
  });
}

export async function getVaultStateAction() {
  const credentials = await readVaultCredentials();
  if (!credentials) {
    return { hasVault: false, isUnlocked: false } as const;
  }
  const cookieStore = await cookies();
  const cookie = cookieStore.get(VAULT_SESSION_COOKIE)?.value;
  const isUnlocked = cookie
    ? Boolean(getVaultSessionKey(cookie, credentials))
    : false;
  return { hasVault: true, isUnlocked } as const;
}

export async function unlockVaultAction(passphrase: string): Promise<ActionResult> {
  const username = await getAuthenticatedUsername();
  if (!username) {
    return { ok: false, error: "unauthorized" };
  }
  const credentials = await readVaultCredentials();
  if (!credentials) {
    return { ok: false, error: "Vault is not configured yet." };
  }
  const masterKey = await verifyVaultPassphrase(credentials, passphrase);
  if (!masterKey) {
    return { ok: false, error: "Invalid vault passphrase." };
  }
  await setVaultSessionCookie(createVaultSessionCookie(credentials, masterKey));
  return { ok: true };
}

export async function createVaultAction(passphrase: string): Promise<ActionResult> {
  const username = await getAuthenticatedUsername();
  if (!username) {
    return { ok: false, error: "unauthorized" };
  }
  const existing = await readVaultCredentials();
  if (existing) {
    return { ok: false, error: "Vault already exists." };
  }
  const vaultError = validateVaultPassphrase(passphrase);
  if (vaultError) return { ok: false, error: vaultError };
  const credentials = await createVaultCredentials(passphrase);
  const masterKey = await verifyVaultPassphrase(credentials, passphrase);
  if (!masterKey) {
    return { ok: false, error: "Unable to initialize vault." };
  }
  await setVaultSessionCookie(createVaultSessionCookie(credentials, masterKey));
  return { ok: true };
}

export async function lockVaultAction() {
  const cookieStore = await cookies();
  cookieStore.set(VAULT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: SESSION_COOKIE_SECURE,
  });
  return { ok: true } as const;
}
