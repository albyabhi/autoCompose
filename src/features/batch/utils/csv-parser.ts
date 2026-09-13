"use client";

import {
  EMAIL_CATEGORIES,
  isEmailCategory,
  type EmailCategory,
} from "@/modules/email/categories";

export const CSV_MAX_ROWS = 50;
export const CSV_MAX_CHARS = 1_048_576; // ~1MB
export const CSV_REQUIRED_HEADERS = ["recipient", "prompt"] as const;
export const CSV_OPTIONAL_HEADERS = ["category"] as const;

export const CSV_TEMPLATE = `recipient,prompt,category
manager@co.com,"Write a 3-day leave request for next week",leave_request
hr@co.com,"Request sick leave for today, fever",sick_leave
`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CsvParsedRow {
  recipient: string;
  prompt: string;
  category: EmailCategory;
  /** True when the CSV category was missing/invalid and fallback was used. */
  usedFallbackCategory: boolean;
}

export interface CsvRowError {
  line: number;
  message: string;
}

export interface CsvParseResult {
  rows: CsvParsedRow[];
  errors: CsvRowError[];
  /** Rows dropped because the file exceeded CSV_MAX_ROWS. */
  truncated: number;
  /** Rows where fallbackCategory was applied. */
  fallbackCount: number;
}

/** Quote-aware CSV tokenizer supporting commas, "" escapes and multiline quoted fields. */
function tokenizeCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldHasContent = false;

  const pushField = () => {
    row.push(field);
    field = "";
    fieldHasContent = false;
  };
  const pushRow = () => {
    // Skip fully-empty lines (e.g. trailing newline).
    const isEmpty = row.length === 0 || row.every((c) => c.trim() === "");
    if (!isEmpty) rows.push(row);
    row = [];
  };

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          fieldHasContent = true;
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
        if (ch !== "\r" && ch !== "\n") fieldHasContent = true;
        else fieldHasContent = true;
      }
    } else if (ch === '"' && !fieldHasContent && field === "") {
      inQuotes = true;
      fieldHasContent = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\r") {
      // Handle CRLF as one break; lone CR also breaks.
      if (normalized[i + 1] === "\n") i++;
      pushField();
      pushRow();
    } else if (ch === "\n") {
      pushField();
      pushRow();
    } else {
      field += ch;
      if (ch.trim() !== "") fieldHasContent = true;
      else if (field.length > 0) fieldHasContent = true;
    }
  }
  // Flush trailing field/row.
  if (inQuotes) {
    // Unterminated quote — treat remainder as field content.
    row.push(field);
    rows.push(row);
    return rows;
  }
  if (field !== "" || fieldHasContent || row.length > 0) {
    pushField();
    pushRow();
  }
  return rows;
}

export function parseBatchCsv(
  text: string,
  fallbackCategory: EmailCategory = "custom"
): CsvParseResult {
  const errors: CsvRowError[] = [];
  const rows: CsvParsedRow[] = [];
  let fallbackCount = 0;

  if (!text || text.trim() === "") {
    return {
      rows,
      errors: [{ line: 0, message: "CSV file is empty." }],
      truncated: 0,
      fallbackCount: 0,
    };
  }
  if (text.length > CSV_MAX_CHARS) {
    return {
      rows,
      errors: [{ line: 0, message: "CSV file exceeds the 1 MB size limit." }],
      truncated: 0,
      fallbackCount: 0,
    };
  }

  const table = tokenizeCsv(text);
  if (table.length === 0) {
    return {
      rows,
      errors: [{ line: 0, message: "CSV file is empty." }],
      truncated: 0,
      fallbackCount: 0,
    };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const recipientIdx = header.indexOf("recipient");
  const promptIdx = header.indexOf("prompt");
  const categoryIdx = header.indexOf("category");

  if (recipientIdx === -1 || promptIdx === -1) {
    return {
      rows,
      errors: [
        {
          line: 1,
          message:
            'Missing required header. Expected "recipient,prompt,category" (category optional).',
        },
      ],
      truncated: 0,
      fallbackCount: 0,
    };
  }

  let truncated = 0;
  const dataLines = table.slice(1);
  for (let i = 0; i < dataLines.length; i++) {
    const lineNo = i + 2; // 1-indexed incl. header
    const cols = dataLines[i];
    const recipient = (cols[recipientIdx] ?? "").trim();
    const prompt = (cols[promptIdx] ?? "").trim();
    const rawCategory = (
      categoryIdx === -1 ? "" : (cols[categoryIdx] ?? "")
    ).trim();

    if (!recipient && !prompt && !rawCategory) continue;

    if (!recipient) {
      errors.push({ line: lineNo, message: "Missing recipient email." });
      continue;
    }
    if (!EMAIL_RE.test(recipient) || recipient.length > 320) {
      errors.push({ line: lineNo, message: `"${recipient}" is not a valid email.` });
      continue;
    }
    if (!prompt || prompt.length < 10) {
      errors.push({
        line: lineNo,
        message: "Prompt must be at least 10 characters.",
      });
      continue;
    }
    if (prompt.length > 5000) {
      errors.push({
        line: lineNo,
        message: "Prompt cannot exceed 5000 characters.",
      });
      continue;
    }

    let category: EmailCategory = fallbackCategory;
    let usedFallbackCategory = false;
    if (!rawCategory) {
      usedFallbackCategory = true;
      fallbackCount++;
    } else if (isEmailCategory(rawCategory.toLowerCase())) {
      category = rawCategory.toLowerCase() as EmailCategory;
    } else {
      usedFallbackCategory = true;
      fallbackCount++;
      // Validate category value is at least recognizable; unknown falls back silently
      // but counts so UI can note it. Known list exported for the format help.
      void EMAIL_CATEGORIES;
    }

    if (rows.length >= CSV_MAX_ROWS) {
      truncated++;
      continue;
    }
    rows.push({ recipient, prompt, category, usedFallbackCategory });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: 0, message: "No data rows found in CSV." });
  }

  return { rows, errors, truncated, fallbackCount };
}

export function buildCsvTemplate(): string {
  return CSV_TEMPLATE;
}

// ============================================================
// FILE: src/features/batch/utils/csv-parser.ts
// ============================================================
// PURPOSE: Client-side CSV parsing for batch row prefill (recipient + prompt + optional category).
// HOW IT WORKS: Quote-aware tokenizer handles commas, "" escapes, CRLF/LF and multiline quoted prompts. Header lookup is case-insensitive and order-agnostic; missing/invalid category falls back to the toolbar Mail Type. Enforces 50 rows/import and 1MB cap, collecting per-line errors so callers can skip-invalid/import-valid.
// INTEGRATION: Used by batch-csv-import.tsx; mirrors bulk validation thresholds (email, prompt 10-5000); feeds existing createEntries API unchanged.
// ============================================================
