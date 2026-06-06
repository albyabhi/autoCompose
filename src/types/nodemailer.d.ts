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
