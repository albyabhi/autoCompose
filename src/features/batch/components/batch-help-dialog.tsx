"use client";

import { useState, useEffect, useCallback } from "react";

const TIPS = [
  "Start with 5-10 rows to test your configuration before scaling up.",
  'Use "Apply to All" to set the same mail type across all pending rows.',
  "Shared attachments are sent with every email in the batch.",
  'Generate emails one-by-one or use "Send All" for bulk delivery.',
];

export function BatchHelpDialog() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < 768
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const tipsList = (
    <ul className="batch-help-dialog__list">
      {TIPS.map((tip, i) => (
        <li key={i} className="batch-help-dialog__tip">{tip}</li>
      ))}
    </ul>
  );

  if (open && isMobile) {
    return (
      <div className="batch-help-dialog-page">
        <div className="batch-help-dialog-page__header">
          <button
            type="button"
            className="batch-help-dialog-page__back"
            onClick={close}
            aria-label="Go back"
          >
            &larr;
          </button>
          <h2 className="batch-help-dialog-page__title">Quick Tips</h2>
        </div>
        <div className="batch-help-dialog-page__body">
          {tipsList}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="batch-help-dialog__trigger"
        onClick={() => setOpen(true)}
        aria-label="Show quick tips"
        title="Quick Tips"
      >
        ?
      </button>

      {open && (
        <div className="dialog-backdrop" onClick={close} role="presentation">
          <div
            className="dialog batch-help-dialog__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-help-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog__header batch-help-dialog__header">
              <h2 id="batch-help-dialog-title" className="dialog__title">
                Quick Tips
              </h2>
              <button
                type="button"
                className="batch-help-dialog__close"
                onClick={close}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="dialog__body">
              {tipsList}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// FILE: src/features/batch/components/batch-help-dialog.tsx
// ============================================================
// PURPOSE: Floating (?) button that opens a dialog with quick tips for batch email generation.
// HOW IT WORKS: On desktop, renders a fixed (?) button at bottom-right. Clicking opens a centered dialog modal with tips. On mobile (<768px), clicking opens a full-screen page overlay with a back button. Escape key and backdrop click close the dialog.
// PROPS: None (self-contained component).
// INTEGRATION: No external dependencies — standalone component.
// ============================================================
