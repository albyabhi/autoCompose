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
// PURPOSE: Standard text input with label and validation error — consistent Neubrutalist styling across all forms.
// HOW IT WORKS: forwardRef wraps native <input>. Auto-generates id from label (e.g., "Email Address" -> "input-email-address"). Renders <label> if provided. Applies error class (field-input--error) and shows error message paragraph when error prop is provided. Wraps everything in field-group div for consistent spacing.
// PROPS: label (string), error (string), plus all native HTMLInputElement attributes (type, value, onChange, placeholder, required, etc.).
// INTEGRATION: React (forwardRef), Neubrutalist CSS. Used in SendEmailDialog, ProfileForm, LoginForm, RegisterForm, ContactAutocomplete, etc.
// ============================================================
