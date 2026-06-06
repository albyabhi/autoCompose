import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto";

describe("crypto", () => {
  it("round-trips a typical 16-char app password", () => {
    const plain = "abcdefghijklmnop";
    const stored = encrypt(plain);
    expect(stored).not.toContain(plain);
    expect(decrypt(stored)).toBe(plain);
  });

  it("round-trips a spaced app password (storage is always canonical)", () => {
    const plain = "abcd efgh ijkl mnop";
    const stored = encrypt(plain);
    expect(decrypt(stored)).toBe(plain);
  });

  it("produces a fresh iv on every call (no deterministic ciphertext)", () => {
    const a = encrypt("same-input");
    const b = encrypt("same-input");
    expect(a).not.toBe(b);
  });

  it("stores in the v1:iv:tag:ct shape", () => {
    const stored = encrypt("abcdefghijklmnop");
    const parts = stored.split(":");
    expect(parts[0]).toBe("v1");
    expect(parts[1]).toHaveLength(24);
    expect(parts[2]).toHaveLength(32);
    expect(parts[3]?.length ?? 0).toBeGreaterThan(0);
  });

  it("rejects empty input on encrypt", () => {
    expect(() => encrypt("")).toThrow();
  });

  it("rejects empty input on decrypt", () => {
    expect(() => decrypt("")).toThrow();
  });

  it("rejects malformed ciphertext (wrong number of parts)", () => {
    expect(() => decrypt("v1:aa:bb")).toThrow(/malformed/);
  });

  it("rejects malformed ciphertext (non-hex iv)", () => {
    expect(() => decrypt("v1:zz:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:00")).toThrow(/iv/);
  });

  it("rejects malformed ciphertext (wrong-length iv)", () => {
    expect(() => decrypt("v1:aa:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:00")).toThrow(/iv/);
  });

  it("rejects malformed ciphertext (wrong-length auth tag)", () => {
    expect(() => decrypt("v1:aaaaaaaaaaaaaaaaaaaaaaaa:aa:00")).toThrow(/auth tag/);
  });

  it("rejects an unknown version prefix", () => {
    expect(() =>
      decrypt("v2:aaaaaaaaaaaaaaaaaaaaaaaa:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:00")
    ).toThrow(/version/);
  });

  it("rejects tampered ciphertext (tag mismatch)", () => {
    const stored = encrypt("abcdefghijklmnop");
    const parts = stored.split(":");
    const tampered = [...parts];
    const ct = tampered[3]!.split("");
    ct[0] = ct[0] === "0" ? "1" : "0";
    tampered[3] = ct.join("");
    expect(() => decrypt(tampered.join(":"))).toThrow();
  });

  it("rejects tampered auth tag", () => {
    const stored = encrypt("abcdefghijklmnop");
    const parts = stored.split(":");
    const tag = parts[2]!.split("");
    tag[0] = tag[0] === "0" ? "1" : "0";
    parts[2] = tag.join("");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("rejects tampered iv", () => {
    const stored = encrypt("abcdefghijklmnop");
    const parts = stored.split(":");
    const iv = parts[1]!.split("");
    iv[0] = iv[0] === "0" ? "1" : "0";
    parts[1] = iv.join("");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
});
