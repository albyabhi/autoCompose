import { describe, it, expect, vi, beforeEach } from "vitest";

const env = vi.hoisted(() => ({
  enabled: true,
  botToken: "test-bot-token",
  webhookSecret: "super-secret-32-chars-minimum-12345",
  botUsername: "TestBot",
}));

vi.mock("@/config", () => ({
  getConfig: () => ({
    telegram: {
      botToken: env.enabled ? env.botToken : null,
      webhookSecret: env.enabled ? env.webhookSecret : null,
      botUsername: env.botUsername,
      enabled: env.enabled,
    },
  }),
}));

const auditMock = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/lib/audit", () => ({
  recordAudit: auditMock.record,
}));

const loggerMock = vi.hoisted(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: loggerMock }));

const handleUpdateMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/telegram/bot", () => ({
  ensureBotMiddleware: async () => ({
    handleUpdate: handleUpdateMock,
  }),
  isTelegramEnabled: () => env.enabled,
}));

vi.mock("@/modules/telegram/webhook", () => ({
  handleUpdate: handleUpdateMock,
}));

beforeEach(() => {
  auditMock.record.mockReset();
  auditMock.record.mockResolvedValue(undefined);
  handleUpdateMock.mockReset();
  handleUpdateMock.mockResolvedValue(undefined);
});

async function callRoute(request: Request) {
  const mod = await import("./route");
  return mod.POST(request as unknown as Parameters<typeof mod.POST>[0]);
}

describe("POST /api/telegram/webhook", () => {
  it("returns 401 when secret header is missing", async () => {
    const req = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 1 }),
    });
    const res = await callRoute(req);
    expect(res.status).toBe(401);
    expect(handleUpdateMock).not.toHaveBeenCalled();
  });

  it("returns 401 when secret header is wrong", async () => {
    const req = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "wrong" },
      body: JSON.stringify({ update_id: 2 }),
    });
    const res = await callRoute(req);
    expect(res.status).toBe(401);
    expect(auditMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "telegram.webhook_rejected" })
    );
  });

  it("returns 503 when bot is disabled", async () => {
    env.enabled = false;
    try {
      const req = new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": env.webhookSecret },
        body: JSON.stringify({ update_id: 3 }),
      });
      const res = await callRoute(req);
      expect(res.status).toBe(503);
    } finally {
      env.enabled = true;
    }
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": env.webhookSecret },
      body: "not json",
    });
    const res = await callRoute(req);
    expect(res.status).toBe(400);
  });

  it("delegates to bot.handleUpdate when valid", async () => {
    const update = { update_id: 42, message: { chat: { id: 1 }, text: "/start" } };
    const req = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": env.webhookSecret },
      body: JSON.stringify(update),
    });
    const res = await callRoute(req);
    expect(res.status).toBe(200);
    expect(handleUpdateMock).toHaveBeenCalledWith(update);
  });
});
