import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const loadStateForUser = vi.fn();
  const saveState = vi.fn();
  const replyHtml = vi.fn();
  const extractSubject = vi.fn();

  return {
    loadStateForUser,
    saveState,
    replyHtml,
    extractSubject,
    ctx: (overrides: Record<string, unknown> = {}) =>
      ({
        chat: { id: 12345 },
        message: { text: "/skip" },
        ...overrides,
      }) as never,
  };
});

vi.mock("@/lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/models/user", () => ({
  User: {
    findOne: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: "user-1" }),
      }),
    }),
  },
}));
vi.mock("@/modules/telegram/state", () => ({
  saveState: mocks.saveState,
  loadStateForUser: mocks.loadStateForUser,
  clearState: vi.fn(),
}));
vi.mock("@/modules/telegram/keyboards", () => ({
  sendConfirmKeyboard: vi.fn(),
  mainMenuKeyboard: vi.fn(),
}));
vi.mock("@/modules/email/content", () => ({
  extractSubject: mocks.extractSubject,
  stripSubjectLine: vi.fn().mockReturnValue(""),
}));
vi.mock("@/modules/email/dispatch", () => ({
  dispatchSendEmail: vi.fn(),
  validateRecipientEmail: vi.fn(),
}));
vi.mock("@/modules/telegram/reply", () => ({
  replyHtml: mocks.replyHtml,
  answerCb: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/config", () => ({
  getConfig: () => ({ app: { url: "http://test.com" } }),
}));
vi.mock("@/modules/telegram/ratelimit", () => ({
  checkTelegramRateLimit: vi.fn(),
  TELEGRAM_RATE_KEYS: { send: vi.fn(), loginCodeAttempt: vi.fn() },
  TELEGRAM_RATE_LIMITS: { send: {}, loginCodeAttempt: {} },
}));

function mockState(overrides: Record<string, unknown> = {}) {
  return {
    step: "awaiting_subject",
    pendingSendTo: "test@example.com",
    draftSnapshot: "Subject: Meeting notes\n\nBody here",
    ...overrides,
  };
}

async function importSubjectInput() {
  const mod = await import("./send");
  return mod.handleSubjectInput;
}

describe("handleSubjectInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadStateForUser.mockResolvedValue(mockState());
    mocks.extractSubject.mockReturnValue("Meeting notes");
    mocks.saveState.mockResolvedValue(undefined);
    mocks.replyHtml.mockResolvedValue(undefined);
  });

  it("uses auto-generated subject when /skip is typed", async () => {
    mocks.extractSubject.mockReturnValue("Meeting notes");
    mocks.loadStateForUser.mockResolvedValue(mockState());

    const handleSubjectInput = await importSubjectInput();
    await handleSubjectInput(mocks.ctx(), "/skip");

    expect(mocks.extractSubject).toHaveBeenCalledWith("Subject: Meeting notes\n\nBody here");
    expect(mocks.saveState).toHaveBeenCalledWith(
      "12345",
      "user-1",
      expect.objectContaining({
        step: "awaiting_send_confirm",
        pendingSubject: "Meeting notes",
      })
    );
    expect(mocks.replyHtml).not.toHaveBeenCalledWith(
      expect.any(Object),
      expect.stringContaining("Could not detect"),
      expect.any(Object)
    );
  });

  it("prompts user for subject when auto-subject is the default fallback", async () => {
    mocks.extractSubject.mockReturnValue("Email from AutoCompose");
    mocks.loadStateForUser.mockResolvedValue(mockState());

    const handleSubjectInput = await importSubjectInput();
    await handleSubjectInput(mocks.ctx(), "/skip");

    expect(mocks.replyHtml).toHaveBeenCalledWith(
      expect.any(Object),
      expect.stringContaining("Could not detect an auto-generated subject")
    );
    expect(mocks.saveState).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ step: "awaiting_send_confirm" })
    );
  });

  it("uses custom subject when user types text", async () => {
    mocks.loadStateForUser.mockResolvedValue(mockState());

    const handleSubjectInput = await importSubjectInput();
    await handleSubjectInput(mocks.ctx(), "My custom subject");

    expect(mocks.saveState).toHaveBeenCalledWith(
      "12345",
      "user-1",
      expect.objectContaining({
        step: "awaiting_send_confirm",
        pendingSubject: "My custom subject",
      })
    );
  });

  it("rejects empty subject", async () => {
    mocks.loadStateForUser.mockResolvedValue(mockState());

    const handleSubjectInput = await importSubjectInput();
    await handleSubjectInput(mocks.ctx(), "");

    expect(mocks.replyHtml).toHaveBeenCalledWith(
      expect.any(Object),
      expect.stringContaining("cannot be empty")
    );
    expect(mocks.saveState).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ step: "awaiting_send_confirm" })
    );
  });

  it("shows flow lost error when state has no pendingSendTo", async () => {
    mocks.loadStateForUser.mockResolvedValue(mockState({ pendingSendTo: undefined }));

    const handleSubjectInput = await importSubjectInput();
    await handleSubjectInput(mocks.ctx(), "/skip");

    expect(mocks.replyHtml).toHaveBeenCalledWith(
      expect.any(Object),
      expect.stringContaining("Send flow lost"),
      expect.any(Object)
    );
  });

  it("shows flow lost error when state has no draftSnapshot", async () => {
    mocks.loadStateForUser.mockResolvedValue(mockState({ draftSnapshot: undefined }));

    const handleSubjectInput = await importSubjectInput();
    await handleSubjectInput(mocks.ctx(), "/skip");

    expect(mocks.replyHtml).toHaveBeenCalledWith(
      expect.any(Object),
      expect.stringContaining("Send flow lost"),
      expect.any(Object)
    );
  });
});

// ============================================================
// FILE: src/modules/telegram/flows/send.test.ts
// ============================================================
// PURPOSE: Tests for the email sending flow's subject input handler.
// HOW IT WORKS: Mocks state, context, and dependencies to test
//   handleSubjectInput behavior for /skip, custom subject, empty input,
//   and missing state edge cases.
// INTEGRATION: vitest, @/modules/telegram/flows/send
// ============================================================
