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
// PURPOSE: Low-level Gmail SMTP email sender using nodemailer.
// HOW IT WORKS: buildTransporter() creates a nodemailer transport configured
//   for Gmail's SMTP server (port 465, SSL). sendEmail() formats the "from"
//   field with optional sender name, sends the email as plain text, and
//   returns the messageId. The transporter is always closed in the finally
//   block to prevent connection leaks.
// [SECURITY] Server-only - receives decrypted app passwords transiently
// INTEGRATION: Gmail SMTP (smtp.gmail.com:465), called by dispatch module
// ============================================================
