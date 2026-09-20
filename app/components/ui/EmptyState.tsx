import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        rounded-2xl border border-dashed border-[var(--border-default)]
        bg-[var(--surface-secondary)]/30 p-12
        animate-fade-in-up
        ${className}
      `.trim()}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary-500)] ring-8 ring-[var(--color-primary-50)]/50 mb-5">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
