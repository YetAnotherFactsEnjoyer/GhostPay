import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  secondary?: boolean;
}

export function Button({
  children,
  secondary,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button ${secondary ? "button-secondary" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
