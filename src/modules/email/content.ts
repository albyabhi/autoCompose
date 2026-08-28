export interface ParsedEmailContent {
  subject: string;
  body: string;
}

export function cleanAIContent(content: string): string {
  return content.replace(/^\s*[*\-]\s+/gm, "");
}

const SUBJECT_PREFIX = /^subject\s*:\s*(.+)$/i;

export function extractSubject(content: string): string {
  const firstLine =
    content
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  const match = firstLine.match(SUBJECT_PREFIX);
  if (match) return match[1]!.trim().slice(0, 200);
  if (/^subject\s*:/i.test(firstLine)) return "Email from AutoCompose";
  return firstLine.slice(0, 200) || "Email from AutoCompose";
}

export function stripSubjectLine(content: string): string {
  const lines = content.split("\n");
  let subjectIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim().length > 0) {
      subjectIdx = i;
      break;
    }
  }
  if (subjectIdx === -1) return content;
  let result = lines.slice(subjectIdx + 1);
  if (result.length > 0 && result[0]!.trim() === "") {
    result = result.slice(1);
  }
  return result.join("\n").trim();
}

const EMAIL_IN_TEXT_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

export function extractEmailFromText(text: string): string | null {
  const match = text.match(EMAIL_IN_TEXT_REGEX);
  return match ? match[0] : null;
}

export function parseEmailContent(content: string): ParsedEmailContent {
  const cleaned = cleanAIContent(content);
  return {
    subject: extractSubject(cleaned),
    body: stripSubjectLine(cleaned),
  };
}

// ============================================================
// FILE: src/modules/email/content.ts
// ============================================================
// PURPOSE: Turns the AI's raw text response into a clean subject line and body for sending.
// HOW IT WORKS: The AI sometimes returns the email with "Subject: ..." on the first line, or with markdown bullets. This module normalizes that:
//   - cleanAIContent(): Strips leading markdown bullet characters (* or -) from lines.
//   - extractSubject(): Looks at the first non-empty line. If it starts with "Subject: ", extracts everything after the colon. Otherwise uses the whole first line (max 200 chars). Fallback: "Email from AutoCompose".
//   - stripSubjectLine(): Removes the subject line and any blank line after it, returning just the body.
//   - parseEmailContent(): One-stop function that cleans, extracts subject, and strips it from body. Returns { subject, body }.
//   - extractEmailFromText(): Bonus helper that finds the first email address in a string (used when user pastes recipient info).
// INTEGRATION: Used by Telegram send flow (src/modules/telegram/flows/send.ts) to parse AI output before sending, schedule processor (src/modules/schedule/service.ts) when generating scheduled emails, bulk service (src/modules/bulk/service.ts) when parsing generated content, and the web UI send dialog.
// ============================================================
