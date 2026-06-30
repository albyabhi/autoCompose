"use client";

import { useState } from "react";

export interface ListField {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

export type ListItem = Record<string, string | undefined>;

interface ListSectionProps {
  title: string;
  items: ListItem[];
  fields: ListField[];
  maxItems: number;
  onChange: (items: ListItem[]) => void;
  defaultOpen?: boolean;
}

function emptyItem(fields: ListField[]): ListItem {
  const item: ListItem = {};
  for (const f of fields) {
    item[f.key] = "";
  }
  return item;
}

function ItemCard({
  item,
  index,
  fields,
  onChange,
  onDelete,
}: {
  item: ListItem;
  index: number;
  fields: ListField[];
  onChange: (index: number, field: string, value: string) => void;
  onDelete: (index: number) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="resume-editor__item-card">
      {editing ? (
        <>
          <div className="resume-editor__item-fields">
            {fields.map((f) => (
              <div key={f.key} className="resume-editor__field">
                <label className="field-label">{f.label}</label>
                <input
                  className="field-input"
                  value={item[f.key] ?? ""}
                  onChange={(e) => onChange(index, f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
          <div className="resume-editor__item-actions">
            <button className="resume-editor__save-btn" onClick={() => setEditing(false)} type="button">
              Done
            </button>
            <button className="resume-editor__delete-btn" onClick={() => onDelete(index)} type="button">
              Delete
            </button>
          </div>
        </>
      ) : (
        <div className="resume-editor__item-display-row">
          <div className="resume-editor__item-display">
            <span className="resume-editor__item-primary">
              {item[fields[0]?.key] || "(empty)"}
            </span>
            {fields.length > 1 && item[fields[1]?.key] && (
              <span className="resume-editor__item-secondary"> · {item[fields[1].key]}</span>
            )}
          </div>
          <div className="resume-editor__item-actions">
            <button className="resume-editor__edit-btn" onClick={() => setEditing(true)} type="button">
              Edit
            </button>
            <button className="resume-editor__delete-btn" onClick={() => onDelete(index)} type="button">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ListSection({ title, items, fields, maxItems, onChange, defaultOpen = false }: ListSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<ListItem>(emptyItem(fields));

  const resetNewItem = () => {
    setNewItem(emptyItem(fields));
    setAdding(false);
  };

  const handleAdd = () => {
    if (items.length >= maxItems) return;
    const requiredFields = fields.filter((f) => f.required);
    const missing = requiredFields.some((f) => !newItem[f.key]?.trim());
    if (missing) return;
    onChange([...items, { ...newItem }]);
    resetNewItem();
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const requiredFields = fields.filter((f) => f.required);
  const addDisabled = adding && requiredFields.some((f) => !newItem[f.key]?.trim());

  return (
    <div className="resume-editor-section">
      <button className="resume-editor-section__header" onClick={() => setOpen(!open)} type="button">
        <span className="resume-editor-section__toggle">{open ? "▾" : "▸"}</span>
        <h3 className="resume-editor-section__title">
          {title} <span className="resume-editor-section__count">({items.length})</span>
        </h3>
      </button>
      {open && (
        <div className="resume-editor-section__body">
          {items.length === 0 && !adding && (
            <p className="resume-editor__empty">No {title.toLowerCase()} added yet</p>
          )}
          <div className="resume-editor__list">
            {items.map((item, i) => (
              <ItemCard
                key={i}
                item={item}
                index={i}
                fields={fields}
                onChange={handleItemChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
          {adding ? (
            <div className="resume-editor__add-form">
              {fields.map((f) => (
                <div key={f.key} className="resume-editor__field">
                  <label className="field-label">
                    {f.label}
                    {f.required && <span className="field-label__required"> *</span>}
                  </label>
                  <input
                    className="field-input"
                    value={newItem[f.key] ?? ""}
                    onChange={(e) => setNewItem({ ...newItem, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <div className="resume-editor__add-form-actions">
                <button
                  className="resume-editor__save-btn"
                  onClick={handleAdd}
                  disabled={addDisabled}
                  type="button"
                >
                  Add
                </button>
                <button className="resume-editor__cancel-btn" onClick={resetNewItem} type="button">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            items.length < maxItems && (
              <button className="resume-editor__add-btn resume-editor__add-btn--wide" onClick={() => setAdding(true)} type="button">
                + Add {title.slice(0, -1)}
              </button>
            )
          )}
          {items.length >= maxItems && !adding && (
            <p className="resume-editor__hint resume-editor__hint--warning">
              Maximum {maxItems} {title.toLowerCase()} reached
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FILE: src/features/profile/components/resume-editor-list.tsx
// ============================================================
// PURPOSE: Generic editable list section for Education, Experience, Projects.
// HOW IT WORKS: Renders a collapsible accordion. Each list item is an ItemCard
//   that toggles between display mode (compact) and edit mode (full fields).
//   An Add button opens an inline form. Required fields must be filled to add.
//   Enforces max items. Delete removes immediately with no undo (handled by save/cancel at form level).
// PROPS: title (string), items (ListItem[]), fields (ListField[]), maxItems (number),
//   onChange (items) => void, defaultOpen (boolean)
// INTEGRATION: Used by ResumeEditorForm with field configs per section type
// ============================================================
