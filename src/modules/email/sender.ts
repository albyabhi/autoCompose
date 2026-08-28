import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@/lib/logger";

export interface NodemailerAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  gmailAddress: string;
  appPassword: string;
  senderName?: string;
  attachments?: NodemailerAttachment[];
}

function buildTransporter(gmailAddress: string, appPassword: string): Transporter {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailAddress, pass: appPassword },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
    logger: false,
    debug: false,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
  const transporter = buildTransporter(options.gmailAddress, options.appPassword);
  try {
    const from = options.senderName
      ? `"${options.senderName}" <${options.gmailAddress}>`
      : options.gmailAddress;
    const mailOptions: {
      from: string;
      to: string;
      subject: string;
      text: string;
      attachments?: typeof options.attachments;
    } = {
      from,
      to: options.to,
      subject: options.subject,
      text: options.body,
    };
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments;
    }
    const result = await transporter.sendMail(mailOptions);
    return { messageId: result.messageId };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown";
    logger.warn("sendEmail failed", { reason, host: "smtp.gmail.com" });
    throw error;
  } finally {
    transporter.close();
  }
}

// ============================================================
// FILE: src/modules/email/sender.ts
// ============================================================
// PURPOSE: Actually sends the email through Gmail's SMTP server using the user's Gmail address and app password.
// HOW IT WORKS: This is the lowest-level email sending code — it knows how to talk to Gmail but nothing about the app's business logic.
//   - buildTransporter(): Creates a Nodemailer connection to smtp.gmail.com on port 465 (SSL/TLS) with the user's credentials. Timeouts: 10s connect, 15s socket.
//   - sendEmail(): Takes the recipient, subject, body, sender's Gmail address, decrypted app password, optional sender name, and optional attachments. Formats the "From" header (e.g., "John Doe <john@gmail.com>"), sends as plain text, returns Gmail's messageId. Always closes the connection in a finally block to prevent leaks.
//   This module receives the DECRYPTED app password transiently — it never stores it. The password comes from the profile service which decrypts it from the envelope encryption (crypto.ts).
// [SECURITY] Server-only — marked with "server-only" import. Handles plaintext credentials briefly in memory only.
// INTEGRATION: Gmail SMTP (smtp.gmail.com:465); called by dispatch.ts (src/modules/email/dispatch.ts) which handles rate limiting, credential decryption, and audit logging; used by bulk send (src/modules/bulk/service.ts) and schedule processing (src/modules/schedule/service.ts).
// ============================================================
