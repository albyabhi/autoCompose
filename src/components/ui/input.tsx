"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div className="field-group">
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`field-input ${error ? "field-input--error" : ""} ${className}`}
          {...props}
        />
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

// ============================================================
// FILE: src/components/ui/input.tsx
// ============================================================
// PURPOSE: A form input component with optional label and error message display.
// HOW IT WORKS: Uses forwardRef to wrap a native <input>, generating a stable id from the label text, conditionally rendering a <label> and error paragraph, and applying an error CSS class when validation fails.
// PROPS: label (string), error (string), plus all native input HTML attributes.
// INTEGRATION: React (forwardRef), no external dependencies.
// ============================================================
