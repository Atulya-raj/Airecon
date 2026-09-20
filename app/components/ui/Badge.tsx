import React from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary"
  | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  dotPulse?: boolean;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--surface-secondary)] text-[var(--text-secondary)] ring-1 ring-[var(--border-default)]",
  success:
    "bg-[var(--color-success-50)] text-[var(--color-success-text)] ring-1 ring-[var(--color-success-500)]/20",
  warning:
    "bg-[var(--color-warning-50)] text-[var(--color-warning-text)] ring-1 ring-[var(--color-warning-500)]/20",
  danger:
    "bg-[var(--color-danger-50)] text-[var(--color-danger-text)] ring-1 ring-[var(--color-danger-500)]/20",
  info: "bg-[var(--color-info-50)] text-[var(--color-info-text)] ring-1 ring-[var(--color-info-500)]/20",
  primary:
    "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] ring-1 ring-[var(--color-primary-500)]/20",
  muted:
    "bg-[var(--surface-secondary)] text-[var(--text-tertiary)]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[var(--text-tertiary)]",
  success: "bg-[var(--color-success-500)]",
  warning: "bg-[var(--color-warning-500)]",
  danger: "bg-[var(--color-danger-500)]",
  info: "bg-[var(--color-info-500)]",
  primary: "bg-[var(--color-primary-500)]",
  muted: "bg-[var(--text-tertiary)]",
};

export function Badge({
  variant = "default",
  dot = false,
  dotPulse = false,
  size = "sm",
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        ${size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"}
        ${variantStyles[variant]}
        ${className}
      `.trim()}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotColors[variant]} ${
            dotPulse ? "animate-pulse" : ""
          }`}
        />
      )}
      {children}
    </span>
  );
}

// Convenience wrappers for status badges
export function StatusBadge({
  status,
}: {
  status: "auto_matched" | "reviewed" | "anomalous" | "unmatched" | string;
}) {
  switch (status) {
    case "auto_matched":
      return (
        <Badge variant="success" dot>
          Auto-Matched
        </Badge>
      );
    case "reviewed":
      return (
        <Badge variant="info" dot>
          Reviewed
        </Badge>
      );
    case "anomalous":
      return (
        <Badge variant="warning" dot dotPulse>
          Needs Review
        </Badge>
      );
    case "unmatched":
    default:
      return (
        <Badge variant="default" dot>
          Unmatched
        </Badge>
      );
  }
}
