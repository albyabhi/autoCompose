"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

const TIPS = [
  "Start with 5-10 rows to test your configuration before scaling up.",
  'Use "Apply to All" to set the same mail type across all pending rows.',
  "Shared attachments are sent with every email in the batch.",
  'Generate emails one-by-one or use "Send All" for bulk delivery.',
];

export function BatchSidebar() {
  const [tipsOpen, setTipsOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setTipsOpen(false);
    }
  }, []);

  const toggleTips = useCallback(() => setTipsOpen((prev) => !prev), []);

  return (
    <aside className="batch-sidebar">
      <Card className={`batch-sidebar__section ${tipsOpen ? "batch-sidebar__section--open" : ""}`}>
        <button
          type="button"
          className="batch-sidebar__section-header"
          onClick={toggleTips}
          aria-expanded={tipsOpen}
        >
          <CardHeader>Quick Tips</CardHeader>
        </button>
        {tipsOpen && (
          <CardBody>
            <ul className="batch-sidebar__tips-list">
              {TIPS.map((tip, i) => (
                <li key={i} className="batch-sidebar__tip">
                  {tip}
                </li>
              ))}
            </ul>
          </CardBody>
        )}
      </Card>
    </aside>
  );
}

// ============================================================
// FILE: src/features/batch/components/batch-sidebar.tsx
// ============================================================
// PURPOSE: Right-column sidebar showing quick tips for batch email generation.
// HOW IT WORKS: Renders a Card with collapsible tips list. On desktop, tips are open by default. On mobile (< 768px), tips start closed and can be toggled via click. Uses React state for toggle control and useEffect to detect initial viewport width.
// PROPS: None (self-contained component).
// INTEGRATION: Card/CardHeader/CardBody from ui primitives, no external dependencies.
// ============================================================
