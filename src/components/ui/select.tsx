"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...props }, ref) => {
    const selectId = id ?? `select-${label?.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div className="field-group">
        {label && (
          <label htmlFor={selectId} className="field-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`field-select ${error ? "field-input--error" : ""} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

// ============================================================
// FILE: src/components/ui/select.tsx
// ============================================================
// PURPOSE: A dropdown select component with label, error state, and options array.
// HOW IT WORKS: Uses forwardRef to render a <select> element, mapping the options array to <option> elements. Generates a stable id from the label and shows an error message below when the error prop is provided.
// PROPS: label (string), error (string), options ({ value, label }[]), plus all native select HTML attributes.
// INTEGRATION: React (forwardRef), no external dependencies.
// ============================================================
