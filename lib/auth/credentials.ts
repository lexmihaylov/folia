import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = "folia_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CREDENTIALS_FILE = path.join(process.cwd(), "credentials.json");

export type CredentialsData = {
  username: string;
  passwordHash: string;
  salt: string;
  secret: string;
  createdAt: number;
};

type SessionPayload = {
  u: string;
  exp: number;
};

function isValidCredentials(data: unknown): data is CredentialsData {
  if (!data || typeof data !== "object") return false;
  const candidate = data as CredentialsData;
  return (
    typeof candidate.username === "string" &&
    typeof candidate.passwordHash === "string" &&
    typeof candidate.salt === "string" &&
    typeof candidate.secret === "string" &&
    typeof candidate.createdAt === "number"
  );
}

async function hashPassword(password: string, saltHex: string): Promise<Buffer> {
  const salt = Buffer.from(saltHex, "hex");
  return (await scryptAsync(password, salt, 64)) as Buffer;
}

export async function readCredentials(): Promise<CredentialsData | null> {
  try {
    const raw = await readFile(CREDENTIALS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return isValidCredentials(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function createCredentials(
  username: string,
  password: string,
): Promise<CredentialsData> {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = (await hashPassword(password, salt)).toString("hex");
  const secret = randomBytes(32).toString("hex");
  const createdAt = Date.now();

  const data: CredentialsData = {
    username,
    passwordHash,
    salt,
    secret,
    createdAt,
  };

  await writeFile(CREDENTIALS_FILE, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

export async function verifyPassword(
  credentials: CredentialsData,
  username: string,
  password: string,
): Promise<boolean> {
  if (credentials.username !== username) return false;
  const computed = await hashPassword(password, credentials.salt);
  const stored = Buffer.from(credentials.passwordHash, "hex");
  if (stored.length !== computed.length) return false;
  return timingSafeEqual(stored, computed);
}

export function createSessionCookie(
  credentials: CredentialsData,
  now = Date.now(),
): string {
  const payload: SessionPayload = {
    u: credentials.username,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", credentials.secret)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function getSessionPayload(
  cookieValue: string,
  credentials: CredentialsData,
  now = Date.now(),
): SessionPayload | null {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", credentials.secret)
    .update(encoded)
    .digest("base64url");
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return null;
  }
  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (!payload || payload.u !== credentials.username) return null;
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  return payload;
}

export function verifySessionCookie(
  cookieValue: string,
  credentials: CredentialsData,
  now = Date.now(),
): boolean {
  return Boolean(getSessionPayload(cookieValue, credentials, now));
}
