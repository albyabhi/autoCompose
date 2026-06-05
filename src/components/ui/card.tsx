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
