import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export const VAULT_SESSION_COOKIE = "folia_vault";
export const VAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const VAULT_FILE = path.join(process.cwd(), "vault.json");

export type VaultCredentials = {
  salt: string;
  verifier: string;
  secret: string;
  createdAt: number;
};

type VaultSessionPayload = {
  exp: number;
  iv: string;
  tag: string;
  ciphertext: string;
};

function isValidVault(data: unknown): data is VaultCredentials {
  if (!data || typeof data !== "object") return false;
  const candidate = data as VaultCredentials;
  return (
    typeof candidate.salt === "string" &&
    typeof candidate.verifier === "string" &&
    typeof candidate.secret === "string" &&
    typeof candidate.createdAt === "number"
  );
}

async function deriveMasterKey(passphrase: string, saltHex: string): Promise<Buffer> {
  return (await scryptAsync(passphrase, Buffer.from(saltHex, "hex"), 32)) as Buffer;
}

function wrapKey(secretHex: string): Buffer {
  return Buffer.from(secretHex, "hex");
}

export async function readVaultCredentials(): Promise<VaultCredentials | null> {
  try {
    const raw = await readFile(VAULT_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return isValidVault(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function createVaultCredentials(passphrase: string): Promise<VaultCredentials> {
  const salt = randomBytes(16).toString("hex");
  const verifier = (await deriveMasterKey(passphrase, salt)).toString("hex");
  const data: VaultCredentials = {
    salt,
    verifier,
    secret: randomBytes(32).toString("hex"),
    createdAt: Date.now(),
  };
  await writeFile(VAULT_FILE, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

export async function verifyVaultPassphrase(
  credentials: VaultCredentials,
  passphrase: string,
): Promise<Buffer | null> {
  const derived = await deriveMasterKey(passphrase, credentials.salt);
  const stored = Buffer.from(credentials.verifier, "hex");
  if (stored.length !== derived.length) return null;
  return timingSafeEqual(stored, derived) ? derived : null;
}

export function createVaultSessionCookie(
  credentials: VaultCredentials,
  masterKey: Buffer,
  now = Date.now(),
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", wrapKey(credentials.secret), iv);
  const ciphertext = Buffer.concat([cipher.update(masterKey), cipher.final()]);
  const payload: VaultSessionPayload = {
    exp: now + VAULT_SESSION_TTL_MS,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function getVaultSessionKey(
  cookieValue: string,
  credentials: VaultCredentials,
  now = Date.now(),
): Buffer | null {
  let payload: VaultSessionPayload;
  try {
    payload = JSON.parse(Buffer.from(cookieValue, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== "number" || payload.exp < now) {
    return null;
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      wrapKey(credentials.secret),
      Buffer.from(payload.iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64url")),
      decipher.final(),
    ]);
  } catch {
    return null;
  }
}
