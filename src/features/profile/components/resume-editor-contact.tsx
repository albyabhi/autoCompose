"use client";

import { useState } from "react";

interface ContactSectionProps {
  name: string;
  email: string;
  phone: string;
  onChange: (field: "name" | "email" | "phone", value: string) => void;
  defaultOpen?: boolean;
}

export function ContactSection({ name, email, phone, onChange, defaultOpen = true }: ContactSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="resume-editor-section">
      <button className="resume-editor-section__header" onClick={() => setOpen(!open)} type="button">
        <span className="resume-editor-section__toggle">{open ? "▾" : "▸"}</span>
        <h3 className="resume-editor-section__title">Contact Info</h3>
      </button>
      {open && (
        <div className="resume-editor-section__body">
          <div className="resume-editor__field">
            <label className="field-label">Full Name</label>
            <input
              className="field-input"
              value={name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="resume-editor__field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              value={email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="e.g. john@example.com"
            />
          </div>
          <div className="resume-editor__field">
            <label className="field-label">Phone</label>
            <input
              className="field-input"
              value={phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="e.g. +1 555-0123"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/resume-editor-contact.tsx
// ============================================================
// PURPOSE: Editable contact info section (name, email, phone) with collapse/expand.
// HOW IT WORKS: Renders a collapsible accordion with three text inputs. onChange
//   propagates changes to parent via field name and value. Default open.
// PROPS: name, email, phone (strings), onChange (field, value) => void, defaultOpen (boolean)
// INTEGRATION: Used by ResumeEditorForm
// ============================================================
