import { describe, expect, it } from "vitest";
import {
  decryptV1,
  encryptV1,
  encryptV2,
  decryptV2,
  migrateV1ToV2,
  detectVersion,
  encrypt,
  decrypt,
  type EncryptedV2,
} from "./crypto";

const USER_A = "user-a-00000000000000000000001";
const USER_B = "user-b-00000000000000000000002";

// ---------------------------------------------------------------------------
// v1 legacy (backward-compat)
// ---------------------------------------------------------------------------
describe("crypto – v1 legacy", () => {
  it("round-trips a typical 16-char app password", () => {
    const plain = "abcdefghijklmnop";
    const stored = encryptV1(plain);
    expect(stored).not.toContain(plain);
    expect(decryptV1(stored)).toBe(plain);
  });

  it("round-trips a spaced app password", () => {
    const plain = "abcd efgh ijkl mnop";
    const stored = encryptV1(plain);
    expect(decryptV1(stored)).toBe(plain);
  });

  it("produces a fresh iv on every call", () => {
    const a = encryptV1("same-input");
    const b = encryptV1("same-input");
    expect(a).not.toBe(b);
  });

  it("stores in v1:iv:tag:ct shape", () => {
    const stored = encryptV1("abcdefghijklmnop");
    const parts = stored.split(":");
    expect(parts[0]).toBe("v1");
    expect(parts[1]).toHaveLength(24);
    expect(parts[2]).toHaveLength(32);
    expect(parts[3]?.length ?? 0).toBeGreaterThan(0);
  });

  it("rejects empty input on encrypt", () => {
    expect(() => encryptV1("")).toThrow();
  });

  it("rejects empty input on decrypt", () => {
    expect(() => decryptV1("")).toThrow();
  });

  it("rejects malformed ciphertext (wrong number of parts)", () => {
    expect(() => decryptV1("v1:aa:bb")).toThrow(/malformed/);
  });

  it("rejects malformed ciphertext (non-hex iv)", () => {
    expect(() => decryptV1("v1:zz:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:00")).toThrow(/iv/);
  });

  it("rejects malformed ciphertext (wrong-length iv)", () => {
    expect(() => decryptV1("v1:aa:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:00")).toThrow(/iv/);
  });

  it("rejects malformed ciphertext (wrong-length auth tag)", () => {
    expect(() => decryptV1("v1:aaaaaaaaaaaaaaaaaaaaaaaa:aa:00")).toThrow(/auth tag/);
  });

  it("rejects an unknown version prefix", () => {
    expect(() =>
      decryptV1("v2:aaaaaaaaaaaaaaaaaaaaaaaa:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:00")
    ).toThrow(/version/);
  });

  it("rejects tampered ciphertext", () => {
    const stored = encryptV1("abcdefghijklmnop");
    const parts = stored.split(":");
    const ct = parts[3]!.split("");
    ct[0] = ct[0] === "0" ? "1" : "0";
    parts[3] = ct.join("");
    expect(() => decryptV1(parts.join(":"))).toThrow();
  });

  it("rejects tampered auth tag", () => {
    const stored = encryptV1("abcdefghijklmnop");
    const parts = stored.split(":");
    const tag = parts[2]!.split("");
    tag[0] = tag[0] === "0" ? "1" : "0";
    parts[2] = tag.join("");
    expect(() => decryptV1(parts.join(":"))).toThrow();
  });

  it("rejects tampered iv", () => {
    const stored = encryptV1("abcdefghijklmnop");
    const parts = stored.split(":");
    const iv = parts[1]!.split("");
    iv[0] = iv[0] === "0" ? "1" : "0";
    parts[1] = iv.join("");
    expect(() => decryptV1(parts.join(":"))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// convenience wrappers (encrypt / decrypt) delegate to v1
// ---------------------------------------------------------------------------
describe("crypto – convenience wrappers", () => {
  it("encrypt() produces v1 ciphertext", () => {
    const stored = encrypt("test-password");
    expect(stored).toMatch(/^v1:/);
  });

  it("decrypt() handles v1 ciphertext", () => {
    const plain = "test-password";
    const stored = encrypt(plain);
    expect(decrypt(stored)).toBe(plain);
  });
});

// ---------------------------------------------------------------------------
// v2 envelope encryption
// ---------------------------------------------------------------------------
describe("crypto – v2 envelope encryption", () => {
  it("round-trips a typical app password", () => {
    const plain = "abcdefghijklmnop";
    const payload = encryptV2(plain, USER_A);
    expect(payload.version).toBe("v2");
    expect(decryptV2(payload, USER_A)).toBe(plain);
  });

  it("round-trips a spaced app password", () => {
    const plain = "abcd efgh ijkl mnop";
    const payload = encryptV2(plain, USER_A);
    expect(decryptV2(payload, USER_A)).toBe(plain);
  });

  it("produces unique DEKs on every call", () => {
    const a = encryptV2("same-input", USER_A);
    const b = encryptV2("same-input", USER_A);
    expect(a.encryptedDek).not.toBe(b.encryptedDek);
    expect(a.encryptedData).not.toBe(b.encryptedData);
  });

  it("stores encryptedDek and encryptedData as hex-encoded iv:tag:ct", () => {
    const payload = encryptV2("abcdefghijklmnop", USER_A);
    const dekParts = payload.encryptedDek.split(":");
    expect(dekParts).toHaveLength(3);
    expect(dekParts[0]).toHaveLength(24);
    expect(dekParts[1]).toHaveLength(32);

    const dataParts = payload.encryptedData.split(":");
    expect(dataParts).toHaveLength(3);
    expect(dataParts[0]).toHaveLength(24);
    expect(dataParts[1]).toHaveLength(32);
  });

  it("sets dekVersion to 1", () => {
    const payload = encryptV2("abcdefghijklmnop", USER_A);
    expect(payload.dekVersion).toBe(1);
  });

  it("rejects empty input", () => {
    expect(() => encryptV2("", USER_A)).toThrow();
  });

  it("rejects empty input on decrypt", () => {
    expect(() =>
      decryptV2(
        { version: "v2", encryptedDek: "", encryptedData: "", dekVersion: 1 },
        USER_A
      )
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// v2 – per-user isolation
// ---------------------------------------------------------------------------
describe("crypto – v2 per-user isolation", () => {
  it("decrypt fails with wrong userId", () => {
    const payload = encryptV2("secret-password", USER_A);
    expect(() => decryptV2(payload, USER_B)).toThrow();
  });

  it("each user gets an independent DEK", () => {
    const payloadA = encryptV2("same-password", USER_A);
    const payloadB = encryptV2("same-password", USER_B);
    expect(payloadA.encryptedDek).not.toBe(payloadB.encryptedDek);
  });

  it("same plaintext produces different ciphertext for different users", () => {
    const payloadA = encryptV2("same-password", USER_A);
    const payloadB = encryptV2("same-password", USER_B);
    expect(payloadA.encryptedData).not.toBe(payloadB.encryptedData);
  });
});

// ---------------------------------------------------------------------------
// v2 – tamper detection
// ---------------------------------------------------------------------------
describe("crypto – v2 tamper detection", () => {
  it("rejects tampered encryptedDek", () => {
    const payload = encryptV2("abcdefghijklmnop", USER_A);
    const parts = payload.encryptedDek.split(":");
    const ct = parts[2]!.split("");
    ct[0] = ct[0] === "0" ? "1" : "0";
    parts[2] = ct.join("");
    const tampered: EncryptedV2 = { ...payload, encryptedDek: parts.join(":") };
    expect(() => decryptV2(tampered, USER_A)).toThrow();
  });

  it("rejects tampered encryptedData", () => {
    const payload = encryptV2("abcdefghijklmnop", USER_A);
    const parts = payload.encryptedData.split(":");
    const ct = parts[2]!.split("");
    ct[0] = ct[0] === "0" ? "1" : "0";
    parts[2] = ct.join("");
    const tampered: EncryptedV2 = { ...payload, encryptedData: parts.join(":") };
    expect(() => decryptV2(tampered, USER_A)).toThrow();
  });

  it("rejects tampered auth tag in encryptedDek", () => {
    const payload = encryptV2("abcdefghijklmnop", USER_A);
    const parts = payload.encryptedDek.split(":");
    const tag = parts[1]!.split("");
    tag[0] = tag[0] === "0" ? "1" : "0";
    parts[1] = tag.join("");
    const tampered: EncryptedV2 = { ...payload, encryptedDek: parts.join(":") };
    expect(() => decryptV2(tampered, USER_A)).toThrow();
  });

  it("rejects tampered iv in encryptedData", () => {
    const payload = encryptV2("abcdefghijklmnop", USER_A);
    const parts = payload.encryptedData.split(":");
    const iv = parts[0]!.split("");
    iv[0] = iv[0] === "0" ? "1" : "0";
    parts[0] = iv.join("");
    const tampered: EncryptedV2 = { ...payload, encryptedData: parts.join(":") };
    expect(() => decryptV2(tampered, USER_A)).toThrow();
  });

  it("rejects wrong version", () => {
    const payload: EncryptedV2 = {
      version: "v2",
      encryptedDek: "aa:bb:cc",
      encryptedData: "dd:ee:ff",
      dekVersion: 1,
    };
    expect(() => decryptV2({ ...payload, version: "v1" as "v2" }, USER_A)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// v1 → v2 migration
// ---------------------------------------------------------------------------
describe("crypto – migrateV1ToV2", () => {
  it("migrates v1 ciphertext to v2 and decrypts correctly", () => {
    const plain = "abcdefghijklmnop";
    const v1 = encryptV1(plain);
    const v2 = migrateV1ToV2(v1, USER_A);
    expect(v2.version).toBe("v2");
    expect(decryptV2(v2, USER_A)).toBe(plain);
  });

  it("migrated v2 is isolated per user", () => {
    const plain = "abcdefghijklmnop";
    const v1 = encryptV1(plain);
    const v2a = migrateV1ToV2(v1, USER_A);
    const v2b = migrateV1ToV2(v1, USER_B);
    expect(v2a.encryptedDek).not.toBe(v2b.encryptedDek);
    expect(decryptV2(v2a, USER_A)).toBe(plain);
    expect(decryptV2(v2b, USER_B)).toBe(plain);
    expect(() => decryptV2(v2a, USER_B)).toThrow();
  });

  it("preserves the original plaintext through migration", () => {
    const plain = "abcd efgh ijkl mnop";
    const v1 = encryptV1(plain);
    const v2 = migrateV1ToV2(v1, USER_A);
    expect(decryptV2(v2, USER_A)).toBe(plain);
  });

  it("rejects migration of invalid v1 ciphertext", () => {
    expect(() => migrateV1ToV2("invalid:v1:ciphertext", USER_A)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// detectVersion
// ---------------------------------------------------------------------------
describe("crypto – detectVersion", () => {
  it("detects v1 string ciphertext", () => {
    expect(detectVersion("v1:aa:bb:cc")).toBe("v1");
  });

  it("detects v2 EncryptedV2 object", () => {
    const payload: EncryptedV2 = {
      version: "v2",
      encryptedDek: "aa:bb:cc",
      encryptedData: "dd:ee:ff",
      dekVersion: 1,
    };
    expect(detectVersion(payload)).toBe("v2");
  });

  it("throws on unrecognized string format", () => {
    expect(() => detectVersion("not-a-ciphertext")).toThrow();
  });

  it("throws on null", () => {
    expect(() => detectVersion(null as unknown as string)).toThrow();
  });

  it("throws on undefined", () => {
    expect(() => detectVersion(undefined as unknown as string)).toThrow();
  });
});
