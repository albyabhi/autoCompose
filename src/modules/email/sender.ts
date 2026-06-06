import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "@/lib/logger";

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  gmailAddress: string;
  appPassword: string;
  senderName?: string;
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
    const result = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.body,
    });
    return { messageId: result.messageId };
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown";
    logger.warn("sendEmail failed", { reason, host: "smtp.gmail.com" });
    throw error;
  } finally {
    transporter.close();
  }
}
