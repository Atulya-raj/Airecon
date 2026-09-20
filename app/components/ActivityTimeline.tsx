"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { Notification } from "@/lib/recon/store/types";

interface ActivityTimelineProps {
  notifications: Notification[];
}

export function ActivityTimeline({ notifications }: ActivityTimelineProps) {
  const [filter, setFilter] = useState<"all" | "anomaly" | "forecast_update" | "low_confidence">("all");

  const filtered = notifications.filter((n) => filter === "all" || n.kind === filter);

  const getKindDetails = (kind: Notification["kind"]) => {
    switch (kind) {
      case "anomaly":
        return {
          label: "Anomaly",
          variant: "danger" as const,
          icon: (
            <svg className="h-4 w-4 text-[var(--color-danger-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
          bg: "bg-[var(--color-danger-50)]",
        };
      case "low_confidence":
        return {
          label: "Low Confidence",
          variant: "warning" as const,
          icon: (
            <svg className="h-4 w-4 text-[var(--color-warning-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ),
          bg: "bg-[var(--color-warning-50)]",
        };
      case "forecast_update":
      default:
        return {
          label: "System Event",
          variant: "info" as const,
          icon: (
            <svg className="h-4 w-4 text-[var(--color-info-500)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
          bg: "bg-[var(--color-info-50)]",
        };
    }
  };

  return (
    <Card padding="none">
      {/* Header with filter tabs */}
      <div className="border-b border-[var(--border-subtle)] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Audit Trail & Activity Log
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Immutable log of reconciliation runs, anomalies detected, and user approvals.
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-secondary)] text-xs w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === "all"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("anomaly")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === "anomaly"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Anomalies
          </button>
          <button
            onClick={() => setFilter("forecast_update")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === "forecast_update"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Events
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-tertiary)]">
          No activity records matching this filter.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {filtered.map((item) => {
            const meta = getKindDetails(item.kind);
            return (
              <div
                key={item.id}
                className="flex items-start gap-4 px-6 py-4 hover:bg-[var(--surface-secondary)]/40 transition-colors"
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${meta.bg} mt-0.5`}>
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={meta.variant} size="sm">
                      {meta.label}
                    </Badge>
                    <span className="text-xs text-[var(--text-tertiary)] font-mono">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {item.message}
                  </p>

                  {item.transactionId && (
                    <div className="mt-2">
                      <Link
                        href={`/reconcile`}
                        className="text-xs font-semibold text-[var(--color-primary-600)] hover:underline inline-flex items-center gap-1"
                      >
                        Inspect transaction {item.transactionId.slice(0, 8)}... →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
