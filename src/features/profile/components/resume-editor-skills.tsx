"use client";

import { useState } from "react";

interface SkillsSectionProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  defaultOpen?: boolean;
}

export function SkillsSection({ skills, onChange, defaultOpen = true }: SkillsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState("");

  const addSkill = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (skills.length >= 15) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...skills, trimmed]);
    setInput("");
  };

  const removeSkill = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="resume-editor-section">
      <button className="resume-editor-section__header" onClick={() => setOpen(!open)} type="button">
        <span className="resume-editor-section__toggle">{open ? "▾" : "▸"}</span>
        <h3 className="resume-editor-section__title">
          Skills <span className="resume-editor-section__count">({skills.length})</span>
        </h3>
      </button>
      {open && (
        <div className="resume-editor-section__body">
          <div className="resume-editor__add-row">
            <input
              className="field-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a skill and press Enter"
              disabled={skills.length >= 15}
            />
            <button
              className="resume-editor__add-btn"
              onClick={addSkill}
              disabled={!input.trim() || skills.length >= 15}
              type="button"
            >
              + Add
            </button>
          </div>
          {skills.length < 15 && (
            <p className="resume-editor__hint">{15 - skills.length} slots remaining</p>
          )}
          {skills.length >= 15 && (
            <p className="resume-editor__hint resume-editor__hint--warning">Maximum 15 skills reached</p>
          )}
          {skills.length === 0 && (
            <p className="resume-editor__empty">No skills added yet</p>
          )}
          <div className="resume-editor__tags">
            {skills.map((skill, i) => (
              <span key={i} className="resume-editor__tag">
                {skill}
                <button
                  className="resume-editor__tag-remove"
                  onClick={() => removeSkill(i)}
                  type="button"
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/resume-editor-skills.tsx
// ============================================================
// PURPOSE: Editable skills section with tag add/remove, Enter-key support, and max-15 limit.
// HOW IT WORKS: Renders a text input with add button. Press Enter or click Add to insert.
//   Each skill renders as a tag with a remove button. Prevents duplicates and enforces max 15.
// PROPS: skills (string[]), onChange (skills) => void, defaultOpen (boolean)
// INTEGRATION: Used by ResumeEditorForm
// ============================================================
