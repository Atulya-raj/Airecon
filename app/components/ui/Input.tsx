import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  hint,
  error,
  icon,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      {hint && (
        <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-xl border bg-[var(--surface-primary)]
            px-4 py-2.5 text-sm text-[var(--text-primary)]
            placeholder:text-[var(--text-tertiary)]
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30
            ${
              error
                ? "border-[var(--color-danger-500)] focus:border-[var(--color-danger-500)]"
                : "border-[var(--border-default)] focus:border-[var(--color-primary-500)] hover:border-[var(--border-strong)]"
            }
            ${icon ? "pl-10" : ""}
            ${className}
          `.trim()}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-[var(--color-danger-text)] font-medium flex items-center gap-1">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  hint,
  options,
  id,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      {hint && (
        <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>
      )}
      <select
        id={selectId}
        className={`
          w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)]
          px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]
          transition-all duration-200
          hover:border-[var(--border-strong)]
          focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30
          ${className}
        `.trim()}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
