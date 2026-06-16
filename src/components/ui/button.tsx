"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  danger: "btn--danger",
  ghost: "btn--ghost",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn ${variantStyles[variant]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <span className="btn__loader" /> : children}
      </button>
    );
  }
);

Button.displayName = "Button";

// ============================================================
// FILE: src/components/ui/button.tsx
// ============================================================
// PURPOSE: A reusable button component with variant styles and loading state.
// HOW IT WORKS: Uses forwardRef to wrap a native <button>, mapping a variant prop to CSS class names and rendering a spinner span when loading. The button is disabled while loading or when the disabled prop is set.
// PROPS: variant ("primary" | "secondary" | "danger" | "ghost"), loading (boolean), plus all native button HTML attributes.
// INTEGRATION: React (forwardRef), no external dependencies.
// ============================================================
