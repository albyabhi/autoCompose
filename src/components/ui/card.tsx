import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, className = "", children, ...props }: CardProps) {
  return (
    <div className={`card ${hover ? "card--hover" : ""} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card__header ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card__body ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card__footer ${className}`} {...props}>
      {children}
    </div>
  );
}

// ============================================================
// FILE: src/components/ui/card.tsx
// ============================================================
// PURPOSE: A composable card layout component with header, body, and footer sub-components.
// HOW IT WORKS: Each sub-component renders a <div> with BEM-style CSS classes. The root Card applies a hover modifier class when the hover prop is true.
// PROPS: hover (boolean) on Card; all sub-components accept standard HTML div attributes.
// INTEGRATION: React (HTMLAttributes), no external dependencies.
// ============================================================
