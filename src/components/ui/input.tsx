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
