"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

const sizeStyles: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  children,
}: ModalProps) {
  const isModalOpen = open ?? isOpen ?? false;

  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Focus trap
      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      // Focus first focusable element
      setTimeout(() => {
        const first = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 100);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen, handleKeyDown]);

  if (!isModalOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        ref={contentRef}
        className={`
          relative w-full ${sizeStyles[size]}
          bg-[var(--surface-primary)] rounded-2xl
          shadow-xl border border-[var(--border-default)]
          animate-scale-in
          max-h-[90vh] overflow-y-auto
        `}
      >
        {/* Header */}
        {(title || description) && (
          <div className="sticky top-0 z-10 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)] px-6 py-4 rounded-t-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
                aria-label="Close dialog"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
