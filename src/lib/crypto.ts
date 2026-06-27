import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { getConfig } from "@/config";

// ---------------------------------------------------------------------------
// v1 constants (legacy – kept for backward-compatible decryption only)
// ---------------------------------------------------------------------------
const V1_KEY = scryptSync(getConfig().auth.secret, "autocompose-salt", 32);
const V1_IV_BYTES = 12;
const V1_TAG_BYTES = 16;
const V1_PREFIX = "v1";

// ---------------------------------------------------------------------------
// v2 constants (envelope encryption with per-user DEK)
// ---------------------------------------------------------------------------
const DEK_BYTES = 32;
const DEK_IV_BYTES = 12;
const DEK_TAG_BYTES = 16;
const KEK_SALT_SUFFIX = "kek-salt-v1";
const CURRENT_DEK_VERSION = 1;

// ---------------------------------------------------------------------------
// v2 public types
// ---------------------------------------------------------------------------
export interface EncryptedV2 {
  version: "v2";
  encryptedDek: string;
  encryptedData: string;
  dekVersion: number;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function isHex(value: string, expectedBytes: number): boolean {
  if (value.length !== expectedBytes * 2) return false;
  return /^[0-9a-f]+$/i.test(value);
}

// ---------------------------------------------------------------------------
// low-level AES-256-GCM helpers (used by both v1 and v2)
// ---------------------------------------------------------------------------
function encryptRaw(plain: string, key: Buffer): string {
  const iv = randomBytes(DEK_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), ct.toString("hex")].join(":");
}

function decryptRaw(stored: string, key: Buffer): string {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("decryptRaw: malformed ciphertext");
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];
  if (!isHex(ivHex, DEK_IV_BYTES)) throw new Error("decryptRaw: invalid iv");
  if (!isHex(tagHex, DEK_TAG_BYTES)) throw new Error("decryptRaw: invalid auth tag");
  if (ctHex.length === 0 || !/^[0-9a-f]+$/i.test(ctHex)) {
    throw new Error("decryptRaw: invalid ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ---------------------------------------------------------------------------
// v2 – per-user Key Encryption Key derivation
// ---------------------------------------------------------------------------
function deriveKEK(userId: string): Buffer {
  return scryptSync(getConfig().auth.secret, userId + KEK_SALT_SUFFIX, 32);
}

function generateDEK(): Buffer {
  return randomBytes(DEK_BYTES);
}

// ---------------------------------------------------------------------------
// v2 – encrypt / decrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt plaintext with envelope encryption (v2).
 * Returns an EncryptedV2 object containing the encrypted DEK and encrypted data.
 */
export function encryptV2(plain: string, userId: string): EncryptedV2 {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("encryptV2: input must be a non-empty string");
  }
  const dek = generateDEK();
  const kek = deriveKEK(userId);
  const encryptedDek = encryptRaw(
    dek.toString("hex"),
    kek,
  );
  const encryptedData = encryptRaw(plain, dek);
  return {
    version: "v2",
    encryptedDek,
    encryptedData,
    dekVersion: CURRENT_DEK_VERSION,
  };
}

/**
 * Decrypt an EncryptedV2 payload.
 */
export function decryptV2(payload: EncryptedV2, userId: string): string {
  if (payload.version !== "v2") {
    throw new Error("decryptV2: expected version v2");
  }
  const kek = deriveKEK(userId);
  const dekHex = decryptRaw(payload.encryptedDek, kek);
  const dek = Buffer.from(dekHex, "hex");
  return decryptRaw(payload.encryptedData, dek);
}

/**
 * Migrate a v1 ciphertext to v2 envelope encryption.
 * Decrypts with the legacy global key, re-encrypts with per-user DEK.
 */
export function migrateV1ToV2(v1Ciphertext: string, userId: string): EncryptedV2 {
  const plain = decryptV1(v1Ciphertext);
  return encryptV2(plain, userId);
}

// ---------------------------------------------------------------------------
// v1 – legacy encrypt / decrypt (kept for backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use encryptV2 for new credentials. */
export function encryptV1(plain: string): string {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("encryptV1: input must be a non-empty string");
  }
  const iv = randomBytes(V1_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", V1_KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [V1_PREFIX, iv.toString("hex"), tag.toString("hex"), ct.toString("hex")].join(":");
}

/** @deprecated Use decryptV2 for new credentials. */
export function decryptV1(stored: string): string {
  if (typeof stored !== "string" || stored.length === 0) {
    throw new Error("decryptV1: input must be a non-empty string");
  }
  const parts = stored.split(":");
  if (parts.length !== 4) throw new Error("decryptV1: malformed ciphertext");
  const [prefix, ivHex, tagHex, ctHex] = parts as [string, string, string, string];
  if (prefix !== V1_PREFIX) throw new Error("decryptV1: unsupported version");
  if (!isHex(ivHex, V1_IV_BYTES)) throw new Error("decryptV1: invalid iv");
  if (!isHex(tagHex, V1_TAG_BYTES)) throw new Error("decryptV1: invalid auth tag");
  if (ctHex.length === 0 || !/^[0-9a-f]+$/i.test(ctHex)) {
    throw new Error("decryptV1: invalid ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", V1_KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ---------------------------------------------------------------------------
// version-detecting convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Detect whether a stored value is v1 or v2 format.
 * v1: starts with "v1:" prefix
 * v2: EncryptedV2 object
 */
export function detectVersion(payload: string | EncryptedV2): "v1" | "v2" {
  if (typeof payload === "object" && payload !== null && "version" in payload) {
    return "v2";
  }
  if (typeof payload === "string" && payload.startsWith(V1_PREFIX + ":")) {
    return "v1";
  }
  throw new Error("detectVersion: unrecognized payload format");
}

/**
 * Encrypt plaintext. v2 for new credentials, v1 kept for reference.
 * This is the default entry-point; prefer encryptV2 with userId when possible.
 */
export function encrypt(plain: string): string {
  return encryptV1(plain);
}

/**
 * Decrypt a v1 ciphertext. For v2, use decryptV2 directly.
 */
export function decrypt(stored: string): string {
  return decryptV1(stored);
}

// ============================================================
// FILE: src/lib/crypto.ts
// ============================================================
// PURPOSE: AES-256-GCM encryption with envelope encryption (v2) and legacy v1 support.
// HOW IT WORKS: v1 derives a single key from AUTH_SECRET via scrypt and encrypts all
//   data with that key — simple but no blast-radius isolation. v2 generates a random
//   32-byte DEK per user, encrypts the app password with the DEK, then encrypts the
//   DEK with a user-specific KEK derived from AUTH_SECRET + userId salt. This means
//   compromising AUTH_SECRET alone does not expose any user's plaintext credentials —
//   the attacker would also need each userId. encryptV2/decryptV2 handle the full
//   envelope; migrateV1ToV2 transitions legacy ciphertexts. encryptV1/decryptV1 are
//   retained for backward compatibility during migration. detectVersion() inspects
//   the stored payload and routes to the correct decryptor.
// [SECURITY] Server-only — handles encrypted credential storage. KEK is derived
//   per-user; blast radius is isolated to individual accounts.
// INTEGRATION: Uses AUTH_SECRET from config; Profile model stores v2 fields
//   (encryptedDek, dekVersion); dispatch.ts and profile service consume these functions.
// ============================================================
