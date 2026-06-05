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
