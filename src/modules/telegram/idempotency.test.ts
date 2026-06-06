import { describe, it, expect, vi, beforeEach } from "vitest";

const modelMock = vi.hoisted(() => {
  const create = vi.fn();
  return { create };
});

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/models/telegram-update", () => ({
  TelegramUpdate: { create: modelMock.create },
}));

import { isDuplicateUpdate } from "./idempotency";

beforeEach(() => {
  modelMock.create.mockReset();
});

describe("isDuplicateUpdate", () => {
  it("returns false on first insert", async () => {
    modelMock.create.mockResolvedValueOnce({ updateId: 1 });
    const result = await isDuplicateUpdate(1);
    expect(result).toBe(false);
  });

  it("returns true when mongoose throws duplicate key error by code", async () => {
    const dupError = Object.assign(new Error("dup"), { code: 11000 });
    modelMock.create.mockRejectedValueOnce(dupError);
    const result = await isDuplicateUpdate(2);
    expect(result).toBe(true);
  });

  it("returns true when mongoose throws duplicate key error by message", async () => {
    const dupError = new Error("E11000 duplicate key error");
    modelMock.create.mockRejectedValueOnce(dupError);
    const result = await isDuplicateUpdate(3);
    expect(result).toBe(true);
  });

  it("rethrows non-duplicate errors", async () => {
    modelMock.create.mockRejectedValueOnce(new Error("connection lost"));
    await expect(isDuplicateUpdate(4)).rejects.toThrow("connection lost");
  });
});
