"use client";

import React from "react";
import Link from "next/link";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { Insight } from "@/lib/recon/insights";

interface InsightCardsProps {
  insights: Insight[];
}

const insightIcons: Record<string, React.ReactNode> = {
  warning: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  trending: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  check: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  clock: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  dollar: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

const priorityStyles: Record<string, { bg: string; text: string; badgeVariant: "danger" | "warning" | "success" }> = {
  high: {
    bg: "bg-[var(--color-danger-50)] text-[var(--color-danger-500)]",
    text: "text-[var(--color-danger-text)]",
    badgeVariant: "danger",
  },
  medium: {
    bg: "bg-[var(--color-warning-50)] text-[var(--color-warning-500)]",
    text: "text-[var(--color-warning-text)]",
    badgeVariant: "warning",
  },
  low: {
    bg: "bg-[var(--color-success-50)] text-[var(--color-success-500)]",
    text: "text-[var(--color-success-text)]",
    badgeVariant: "success",
  },
};

export function InsightCards({ insights }: InsightCardsProps) {
  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
      {insights.map((insight) => {
        const style = priorityStyles[insight.priority] ?? priorityStyles.low;
        return (
          <Card key={insight.id} className="animate-fade-in-up border-l-4" style={{ borderLeftColor: `var(--color-${insight.priority === "high" ? "danger" : insight.priority === "medium" ? "warning" : "success"}-500)` }}>
            <div className="flex gap-4">
              <div
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${style.bg}`}
              >
                {insightIcons[insight.icon]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {insight.title}
                  </h3>
                  <Badge variant={style.badgeVariant} size="sm">
                    {insight.priority} priority
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {insight.description}
                </p>
                {insight.actionLabel && insight.actionHref && (
                  <Link
                    href={insight.actionHref}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors"
                  >
                    {insight.actionLabel}
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
