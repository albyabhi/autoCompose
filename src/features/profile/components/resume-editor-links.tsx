"use client";

import { useState } from "react";

interface LinksSectionProps {
  linkedin: string;
  github: string;
  portfolio: string;
  onChange: (field: "linkedin" | "github" | "portfolio", value: string) => void;
  defaultOpen?: boolean;
}

export function LinksSection({ linkedin, github, portfolio, onChange, defaultOpen = true }: LinksSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="resume-editor-section">
      <button className="resume-editor-section__header" onClick={() => setOpen(!open)} type="button">
        <span className="resume-editor-section__toggle">{open ? "▾" : "▸"}</span>
        <h3 className="resume-editor-section__title">Links</h3>
      </button>
      {open && (
        <div className="resume-editor-section__body">
          <div className="resume-editor__field">
            <label className="field-label">LinkedIn</label>
            <input
              className="field-input"
              value={linkedin}
              onChange={(e) => onChange("linkedin", e.target.value)}
              placeholder="linkedin.com/in/username"
            />
          </div>
          <div className="resume-editor__field">
            <label className="field-label">GitHub</label>
            <input
              className="field-input"
              value={github}
              onChange={(e) => onChange("github", e.target.value)}
              placeholder="github.com/username"
            />
          </div>
          <div className="resume-editor__field">
            <label className="field-label">Portfolio</label>
            <input
              className="field-input"
              value={portfolio}
              onChange={(e) => onChange("portfolio", e.target.value)}
              placeholder="https://your-portfolio.com"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/resume-editor-links.tsx
// ============================================================
// PURPOSE: Editable links section (LinkedIn, GitHub, Portfolio) with collapse/expand.
// HOW IT WORKS: Renders a collapsible accordion with three text inputs. onChange
//   propagates changes to parent via field name and value. Default open.
// PROPS: linkedin, github, portfolio (strings), onChange (field, value) => void, defaultOpen (boolean)
// INTEGRATION: Used by ResumeEditorForm
// ============================================================
