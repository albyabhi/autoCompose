declare module "nodemailer" {
  interface SendMailOptions {
    from?: string;
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    [key: string]: unknown;
  }

  interface SentMessageInfo {
    messageId: string;
    envelope: { from: string; to: string[] };
    accepted: string[];
    rejected: string[];
    pending?: string[];
    response: string;
  }

  export interface Transporter<S = SentMessageInfo> {
    sendMail(options: SendMailOptions): Promise<S>;
    close(): void;
    verify(): Promise<boolean>;
  }

  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
    connectionTimeout?: number;
    socketTimeout?: number;
    logger?: boolean | unknown;
    debug?: boolean;
    service?: string;
    [key: string]: unknown;
  }

  export function createTransport(options: TransportOptions): Transporter;

  const nodemailer: { createTransport: typeof createTransport };
  export default nodemailer;
}

// ============================================================
// FILE: src/types/nodemailer.d.ts
// ============================================================
// PURPOSE: Local type declarations for the nodemailer package.
// HOW IT WORKS: Declares types for SendMailOptions (to, subject, text, html,
//   headers), SentMessageInfo (messageId, envelope, accepted, rejected),
//   Transporter (sendMail, close, verify), TransportOptions (host, port,
//   secure, auth, timeouts). Provides minimal typing without requiring
//   @types/nodemailer installation.
// INTEGRATION: Used by email sender module for type safety
// ============================================================
