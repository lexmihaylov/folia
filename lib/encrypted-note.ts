import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

export const ENCRYPTED_NOTE_EXTENSION = ".emd";
export const MARKDOWN_NOTE_EXTENSION = ".md";

type EncryptedNotePayload = {
  v: 1;
  alg: "aes-256-gcm";
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
};

function deriveFileKey(masterKey: Buffer, salt: Buffer): Buffer {
  return Buffer.from(
    hkdfSync("sha256", masterKey, salt, Buffer.from("folia-note"), 32),
  );
}

export function isEncryptedNotePath(relativePath: string): boolean {
  return relativePath.endsWith(ENCRYPTED_NOTE_EXTENSION);
}

export function isSupportedNotePath(relativePath: string): boolean {
  return (
    relativePath.endsWith(MARKDOWN_NOTE_EXTENSION) ||
    relativePath.endsWith(ENCRYPTED_NOTE_EXTENSION)
  );
}

export function stripNoteExtension(relativePath: string): string {
  if (relativePath.endsWith(ENCRYPTED_NOTE_EXTENSION)) {
    return relativePath.slice(0, -ENCRYPTED_NOTE_EXTENSION.length);
  }
  if (relativePath.endsWith(MARKDOWN_NOTE_EXTENSION)) {
    return relativePath.slice(0, -MARKDOWN_NOTE_EXTENSION.length);
  }
  return relativePath;
}

export function notePathCandidates(relativePath: string): string[] {
  const base = stripNoteExtension(relativePath);
  return [`${base}${MARKDOWN_NOTE_EXTENSION}`, `${base}${ENCRYPTED_NOTE_EXTENSION}`];
}

export function encryptNoteContent(content: string, masterKey: Buffer): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveFileKey(masterKey, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(content, "utf-8")),
    cipher.final(),
  ]);
  const payload: EncryptedNotePayload = {
    v: 1,
    alg: "aes-256-gcm",
    salt: salt.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
  return JSON.stringify(payload, null, 2);
}

export function decryptNoteContent(raw: string, masterKey: Buffer): string {
  const payload = JSON.parse(raw) as Partial<EncryptedNotePayload>;
  if (
    payload.v !== 1 ||
    payload.alg !== "aes-256-gcm" ||
    typeof payload.salt !== "string" ||
    typeof payload.iv !== "string" ||
    typeof payload.tag !== "string" ||
    typeof payload.ciphertext !== "string"
  ) {
    throw new Error("invalid-encrypted-note");
  }
  const key = deriveFileKey(masterKey, Buffer.from(payload.salt, "base64url"));
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf-8");
}
