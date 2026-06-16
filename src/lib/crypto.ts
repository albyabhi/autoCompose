import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { getConfig } from "@/config";

const KEY = scryptSync(getConfig().auth.secret, "autocompose-salt", 32);
const IV_BYTES = 12;
const TAG_BYTES = 16;
const STORAGE_PREFIX = "v1";

function isHex(value: string, expectedBytes: number): boolean {
  if (value.length !== expectedBytes * 2) return false;
  return /^[0-9a-f]+$/i.test(value);
}

export function encrypt(plain: string): string {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("encrypt: input must be a non-empty string");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [STORAGE_PREFIX, iv.toString("hex"), tag.toString("hex"), ct.toString("hex")].join(":");
}

export function decrypt(stored: string): string {
  if (typeof stored !== "string" || stored.length === 0) {
    throw new Error("decrypt: input must be a non-empty string");
  }
  const parts = stored.split(":");
  if (parts.length !== 4) throw new Error("decrypt: malformed ciphertext");
  const [prefix, ivHex, tagHex, ctHex] = parts;
  if (prefix !== STORAGE_PREFIX) throw new Error("decrypt: unsupported version");
  if (!isHex(ivHex, IV_BYTES)) throw new Error("decrypt: invalid iv");
  if (!isHex(tagHex, TAG_BYTES)) throw new Error("decrypt: invalid auth tag");
  if (ctHex.length === 0 || !/^[0-9a-f]+$/i.test(ctHex)) {
    throw new Error("decrypt: invalid ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ============================================================
// FILE: src/lib/crypto.ts
// ============================================================
// PURPOSE: Provides AES-256-GCM encryption/decryption for sensitive data (Gmail passwords).
// HOW IT WORKS: Derives a 32-byte encryption key from the auth secret using
//   scrypt. encrypt() generates a random 12-byte IV, encrypts the plaintext,
//   and returns a versioned string: "v1:<iv>:<authTag>:<ciphertext>". decrypt()
//   parses this format, validates hex encoding, and decrypts with auth tag
//   verification to detect tampering.
// [SECURITY] Server-only - handles encrypted credential storage
// INTEGRATION: Uses auth secret from config as encryption key source
// ============================================================
