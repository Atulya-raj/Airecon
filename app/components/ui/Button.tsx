"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] active:bg-[var(--color-primary-800)] shadow-sm hover:shadow-md",
  secondary:
    "bg-[var(--surface-primary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--surface-secondary)] hover:border-[var(--border-strong)] shadow-xs",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]",
  danger:
    "bg-[var(--color-danger-500)] text-white hover:bg-[var(--color-danger-600)] shadow-sm",
  success:
    "bg-[var(--color-success-500)] text-white hover:bg-[var(--color-success-600)] shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-6 py-3 text-base gap-2.5 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 ease-out
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-500)]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `.trim()}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="32"
            strokeLinecap="round"
            className="opacity-25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-75"
          />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}
