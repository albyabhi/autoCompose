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
// PURPOSE: The app's standard button — consistent styling, variants, and loading state across all forms and dialogs.
// HOW IT WORKS: forwardRef wraps a native <button>. Maps variant prop to CSS classes (btn--primary, btn--secondary, btn--danger, btn--ghost from Neubrutalist design system). When loading=true: disables button, shows spinner (btn__loader). Disabled state also handles native disabled prop. All other button attributes (onClick, type, etc.) pass through via {...props}.
// PROPS: variant ("primary" | "secondary" | "danger" | "ghost", default "primary"), loading (boolean), plus all native HTMLButtonElement attributes (onClick, type, disabled, etc.).
// INTEGRATION: React (forwardRef), Neubrutalist CSS variables. Used everywhere: GenerateForm, SendEmailDialog, ProfileForm, SessionView, Header, Sidebar, etc.
// ============================================================
