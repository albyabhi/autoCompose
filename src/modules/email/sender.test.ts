import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn();
  const close = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail, close }));
  return { sendMail, close, createTransport };
});

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
  createTransport: mocks.createTransport,
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { sendEmail } from "./sender";

afterEach(() => {
  mocks.sendMail.mockReset();
  mocks.close.mockReset();
  mocks.createTransport.mockClear();
});

describe("sendEmail", () => {
  it("creates a fresh transporter with explicit Gmail SMTP + timeouts", async () => {
    mocks.sendMail.mockResolvedValue({ messageId: "<abc@gmail.com>" });

    await sendEmail({
      to: "x@example.com",
      subject: "Hi",
      body: "Body",
      gmailAddress: "me@gmail.com",
      appPassword: "abcdefghijklmnop",
    });

    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    const config = mocks.createTransport.mock.calls[0]![0];
    expect(config.host).toBe("smtp.gmail.com");
    expect(config.port).toBe(465);
    expect(config.secure).toBe(true);
    expect(config.auth).toEqual({ user: "me@gmail.com", pass: "abcdefghijklmnop" });
    expect(config.connectionTimeout).toBe(10_000);
    expect(config.socketTimeout).toBe(15_000);
    expect(config.logger).toBe(false);
    expect(config.debug).toBe(false);
  });

  it("uses the senderName in the from header when provided", async () => {
    mocks.sendMail.mockResolvedValue({ messageId: "<abc@gmail.com>" });

    await sendEmail({
      to: "x@example.com",
      subject: "Hi",
      body: "Body",
      gmailAddress: "me@gmail.com",
      appPassword: "abcdefghijklmnop",
      senderName: "Arjun",
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Arjun" <me@gmail.com>',
        to: "x@example.com",
        subject: "Hi",
        text: "Body",
      })
    );
  });

  it("falls back to the gmail address when no senderName is provided", async () => {
    mocks.sendMail.mockResolvedValue({ messageId: "<abc@gmail.com>" });

    await sendEmail({
      to: "x@example.com",
      subject: "Hi",
      body: "Body",
      gmailAddress: "me@gmail.com",
      appPassword: "abcdefghijklmnop",
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "me@gmail.com" })
    );
  });

  it("closes the transporter after a successful send", async () => {
    mocks.sendMail.mockResolvedValue({ messageId: "<abc@gmail.com>" });

    await sendEmail({
      to: "x@example.com",
      subject: "Hi",
      body: "Body",
      gmailAddress: "me@gmail.com",
      appPassword: "abcdefghijklmnop",
    });

    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it("closes the transporter even when sendMail throws", async () => {
    const err = Object.assign(new Error("Invalid login"), { name: "EAUTH" });
    mocks.sendMail.mockRejectedValue(err);

    await expect(
      sendEmail({
        to: "x@example.com",
        subject: "Hi",
        body: "Body",
        gmailAddress: "me@gmail.com",
        appPassword: "wrong-password",
      })
    ).rejects.toBe(err);

    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it("returns the messageId on success", async () => {
    mocks.sendMail.mockResolvedValue({ messageId: "<xyz@gmail.com>" });

    const result = await sendEmail({
      to: "x@example.com",
      subject: "Hi",
      body: "Body",
      gmailAddress: "me@gmail.com",
      appPassword: "abcdefghijklmnop",
    });

    expect(result.messageId).toBe("<xyz@gmail.com>");
  });
});
