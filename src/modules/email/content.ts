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
  return firstLine.slice(0, 200) || "Email from AutoCompose";
}

export function stripSubjectLine(content: string): string {
  const lines = content.split("\n");
  let stripped = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i]!.trim();
    if (stripped === 0 && SUBJECT_PREFIX.test(trimmed)) {
      stripped += 1;
      continue;
    }
    if (stripped === 1 && trimmed === "") {
      stripped += 1;
      continue;
    }
    break;
  }
  return lines.slice(stripped).join("\n").trim();
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
// PURPOSE: Utilities for parsing and cleaning AI-generated email content.
// HOW IT WORKS: cleanAIContent() removes markdown bullet prefixes (* or -).
//   extractSubject() reads the first non-empty line; if it starts with
//   "Subject:", the value is extracted; otherwise the first line becomes
//   the subject (truncated to 200 chars). stripSubjectLine() removes the
//   subject prefix and trailing blank line from the body. parseEmailContent()
//   combines these into a { subject, body } object.
// INTEGRATION: Used by Telegram send flow and frontend to split AI output
// ============================================================
