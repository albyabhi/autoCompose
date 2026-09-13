import { describe, it, expect } from "vitest";
import { parseBatchCsv } from "./csv-parser";

describe("parseBatchCsv", () => {
  it("parses a happy-path 3-column file", () => {
    const csv = `recipient,prompt,category
manager@co.com,"Write a 3-day leave request for next week",leave_request
hr@co.com,"Request sick leave for today, fever",sick_leave`;
    const res = parseBatchCsv(csv, "custom");
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({
      recipient: "manager@co.com",
      category: "leave_request",
    });
  });

  it("falls back to toolbar category when missing or unknown", () => {
    const csv = `recipient,prompt,category
a@co.com,"Write a meeting request for Monday sync",
b@co.com,"Write a meeting request for Tuesday sync",not_a_category`;
    const res = parseBatchCsv(csv, "complaint");
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].category).toBe("complaint");
    expect(res.rows[0].usedFallbackCategory).toBe(true);
    expect(res.fallbackCount).toBe(2);
  });

  it("supports reordered headers and quoted commas/newlines in prompt", () => {
    const csv = `prompt,recipient
"Write about alpha, beta, and gamma in detail",x@co.com
"Line one
line two continued here",y@co.com`;
    const res = parseBatchCsv(csv, "custom");
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].prompt).toContain("alpha, beta");
    expect(res.rows[1].prompt).toContain("line two");
  });

  it("handles BOM and CRLF", () => {
    const csv = `﻿recipient,prompt,category\r\na@co.com,"Write a leave request for three days off",leave_request\r\n`;
    const res = parseBatchCsv(csv, "custom");
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(1);
  });

  it("skips invalid rows but imports valid ones", () => {
    const csv = `recipient,prompt,category
not-an-email,"Write a valid prompt with enough length",custom
good@co.com,short,custom
fine@co.com,"Write a proper leave request for next week",leave_request`;
    const res = parseBatchCsv(csv, "custom");
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].recipient).toBe("fine@co.com");
    expect(res.errors).toHaveLength(2);
  });

  it("truncates beyond 50 rows", () => {
    const lines = ["recipient,prompt,category"];
    for (let i = 0; i < 55; i++) {
      lines.push(`user${i}@co.com,"Write a detailed leave request number ${i} for review",custom`);
    }
    const res = parseBatchCsv(lines.join("\n"), "custom");
    expect(res.rows).toHaveLength(50);
    expect(res.truncated).toBe(5);
  });

  it("rejects missing header and empty file", () => {
    expect(parseBatchCsv("", "custom").errors.length).toBeGreaterThan(0);
    const bad = parseBatchCsv("foo,bar\na,b", "custom");
    expect(bad.rows).toHaveLength(0);
    expect(bad.errors[0].message).toMatch(/Missing required header/);
  });
});

// ============================================================
// FILE: src/features/batch/utils/csv-parser.test.ts
// ============================================================
// PURPOSE: Unit tests for the batch CSV parser.
// HOW IT WORKS: Covers happy path, category fallback, quoted/multiline prompts, BOM/CRLF, skip-invalid policy, 50-row truncation, and header/empty errors.
// INTEGRATION: Vitest suite for csv-parser.ts; run via npx vitest run.
// ============================================================
