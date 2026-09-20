import React from "react";

type CardVariant = "default" | "glass" | "outlined" | "elevated";

interface CardProps {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: "card",
  glass: "glass-card",
  outlined:
    "bg-transparent border border-[var(--border-default)] rounded-[var(--radius-xl)]",
  elevated: "card-elevated",
};

const paddingStyles: Record<string, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  variant = "default",
  padding = "md",
  hover = true,
  className = "",
  style,
  children,
}: CardProps) {
  return (
    <div
      style={style}
      className={`
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hover ? "" : "hover:shadow-[var(--shadow-sm)] hover:border-[var(--border-default)]"}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-b border-[var(--border-subtle)] pb-4 mb-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  subtitle,
  badge,
  className = "",
}: {
  children: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5 flex-wrap">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          {children}
        </h3>
        {badge}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
      )}
    </div>
  );
}
