"use client";

import { useRef, useState } from "react";
import type { EmailCategory } from "@/modules/email/categories";
import { EMAIL_CATEGORIES } from "@/modules/email/categories";
import { Button } from "@/components/ui/button";
import {
  CSV_MAX_ROWS,
  buildCsvTemplate,
  parseBatchCsv,
  type CsvParsedRow,
  type CsvRowError,
} from "../utils/csv-parser";

interface BatchCsvImportProps {
  fallbackCategory: EmailCategory;
  disabled?: boolean;
  pending?: boolean;
  onImport: (
    rows: Array<{ category: EmailCategory; prompt: string; recipient: string }>
  ) => void | Promise<void>;
}

export function BatchCsvImport({
  fallbackCategory,
  disabled = false,
  pending = false,
  onImport,
}: BatchCsvImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [formatOpen, setFormatOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvParsedRow[]>([]);
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [truncated, setTruncated] = useState(0);
  const [fallbackCount, setFallbackCount] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  const isBusy = disabled || pending;

  function resetSelection() {
    setFileName(null);
    setPreview([]);
    setErrors([]);
    setTruncated(0);
    setFallbackCount(0);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDownloadTemplate() {
    const blob = new Blob([buildCsvTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please choose a .csv file.");
      return;
    }
    if (file.size > 1_048_576) {
      setFileError("CSV file exceeds the 1 MB size limit.");
      return;
    }
    try {
      const text = await file.text();
      const result = parseBatchCsv(text, fallbackCategory);
      setFileName(file.name);
      setPreview(result.rows);
      setErrors(result.errors);
      setTruncated(result.truncated);
      setFallbackCount(result.fallbackCount);
      if (result.rows.length === 0 && result.errors.length === 0) {
        setFileError("No data rows found in CSV.");
      }
    } catch {
      setFileError("Could not read this CSV file.");
    }
  }

  async function handleConfirm() {
    if (preview.length === 0) return;
    await onImport(
      preview.map((r) => ({
        category: r.category,
        prompt: r.prompt,
        recipient: r.recipient,
      }))
    );
    resetSelection();
  }

  return (
    <div className="batch-csv">
      <div className="batch-csv__header">
        <span className="batch-csv__title">Import from CSV</span>
        <span className="batch-csv__hint">
          Prefill recipient + prompt rows. Other settings stay the same.
        </span>
      </div>

      <details
        className="batch-csv__format"
        open={formatOpen}
        onToggle={(e) => {
          e.stopPropagation();
          setFormatOpen(e.currentTarget.open);
        }}
      >
        <summary
          className="batch-csv__format-toggle"
          onClick={(e) => e.stopPropagation()}
        >
          {formatOpen ? "Hide expected CSV format" : "Show expected CSV format"}
        </summary>
        <div className="batch-csv__format-body">
          <p>
            Header: <code>recipient,prompt,category</code> —{" "}
            <code>category</code> is optional and falls back to the Mail Type
            above. Valid categories: {EMAIL_CATEGORIES.join(", ")}.
          </p>
          <table className="batch-csv__sample" aria-label="CSV format example">
            <thead>
              <tr>
                <th>recipient</th>
                <th>prompt</th>
                <th>category</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>manager@co.com</td>
                <td>Write a 3-day leave request for next week</td>
                <td>leave_request</td>
              </tr>
              <tr>
                <td>hr@co.com</td>
                <td>Request sick leave for today, fever</td>
                <td>sick_leave</td>
              </tr>
            </tbody>
          </table>
          <div className="batch-csv__format-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownloadTemplate}
              disabled={isBusy}
            >
              Download template.csv
            </Button>
            <span className="batch-csv__limit">Max {CSV_MAX_ROWS} rows per import · 1 MB</span>
          </div>
        </div>
      </details>

      <div className="batch-csv__actions">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="batch-csv__input"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
          }}
          disabled={isBusy}
          aria-label="Choose CSV file"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          {fileName ? "Choose different file" : "Choose CSV file"}
        </Button>
        {fileName && (
          <button
            type="button"
            className="batch-csv__clear"
            onClick={resetSelection}
            disabled={isBusy}
            aria-label="Clear selected CSV"
          >
            Clear
          </button>
        )}
      </div>

      {fileError && <div className="batch-csv__error">{fileError}</div>}

      {fileName && !fileError && (
        <div className="batch-csv__preview" aria-live="polite">
          <div className="batch-csv__summary">
            <strong>{fileName}</strong> — {preview.length} valid
            {errors.length > 0 && ` · ${errors.length} invalid (skipped)`}
            {truncated > 0 && ` · ${truncated} beyond ${CSV_MAX_ROWS} ignored`}
          </div>
          {fallbackCount > 0 && (
            <div className="batch-csv__note">
              {fallbackCount} row{fallbackCount !== 1 ? "s" : ""} will use Mail
              Type “{fallbackCategory}” (missing/unknown category).
            </div>
          )}
          {preview.length > 0 && (
            <table className="batch-csv__table" aria-label="CSV preview">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Prompt</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((r) => (
                  <tr key={`${r.recipient}-${r.prompt.slice(0, 24)}`}>
                    <td>{r.recipient}</td>
                    <td>
                      {r.prompt.length > 80
                        ? `${r.prompt.slice(0, 80)}…`
                        : r.prompt}
                    </td>
                    <td>
                      {r.category}
                      {r.usedFallbackCategory ? " *" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {preview.length > 10 && (
            <div className="batch-csv__note">
              Showing first 10 of {preview.length} valid rows.
            </div>
          )}
          {errors.length > 0 && (
            <ul className="batch-csv__errors">
              {errors.slice(0, 8).map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  Line {e.line}: {e.message}
                </li>
              ))}
              {errors.length > 8 && <li>…and {errors.length - 8} more.</li>}
            </ul>
          )}
          <Button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isBusy || preview.length === 0}
          >
            {pending
              ? "Adding rows…"
              : `Add ${preview.length} row${preview.length !== 1 ? "s" : ""} to batch`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/batch/components/batch-csv-import.tsx
// ============================================================
// PURPOSE: CSV file picker that prefills batch recipient + prompt rows with format help.
// HOW IT WORKS: Reads the file client-side, parses with parseBatchCsv using the toolbar Mail Type as fallback, shows expected-format sample + template download + valid/invalid preview, then emits clean rows to the parent which calls the existing createEntries API. Invalid rows are skipped, never sent. The format <details> is controlled and stops propagation so it toggles independently of the Batch Settings panel.
// PROPS: fallbackCategory, disabled, pending, onImport(rows).
// INTEGRATION: csv-parser utils, Button primitive, BatchSettingsPanel host, BatchComposeView importer.
// ============================================================
