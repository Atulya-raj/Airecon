import type {
  ForecastResult,
  Match,
  ReconConfig,
  Transaction,
  VendorPattern,
} from "./types";
import type { Notification } from "./store/types";

export interface Insight {
  id: string;
  kind: "action" | "trend" | "alert" | "tip";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  icon: "warning" | "trending" | "check" | "info" | "clock" | "dollar";
  actionLabel?: string;
  actionHref?: string;
}

interface InsightInput {
  transactions: Transaction[];
  matches: Match[];
  vendorPatterns: VendorPattern[];
  notifications: Notification[];
  forecast: ForecastResult;
  config: ReconConfig;
  counts: {
    total: number;
    autoMatched: number;
    reviewed: number;
    anomalous: number;
    unmatched: number;
  };
}

/**
 * Generates actionable insights from reconciliation data.
 * These are the "so what?" cards that tell users what to do next.
 */
export function generateInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];
  const { counts, transactions, forecast, vendorPatterns, notifications } = input;

  // 1. Pending review items — always high priority
  if (counts.anomalous > 0) {
    insights.push({
      id: "pending-review",
      kind: "action",
      title: `${counts.anomalous} transaction${counts.anomalous > 1 ? "s" : ""} need${counts.anomalous === 1 ? "s" : ""} your review`,
      description:
        counts.anomalous === 1
          ? "There's one flagged transaction that couldn't be automatically matched. Review it to keep your books accurate."
          : `These transactions couldn't be automatically matched and need your attention. The sooner you review them, the more accurate your reports will be.`,
      priority: "high",
      icon: "warning",
      actionLabel: "Review Now",
      actionHref: "/reconcile",
    });
  }

  // 2. Old unmatched transactions
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oldUnmatched = transactions.filter(
    (t) =>
      t.status === "unmatched" &&
      new Date(t.createdAt) < sevenDaysAgo
  );
  if (oldUnmatched.length > 0) {
    insights.push({
      id: "old-unmatched",
      kind: "alert",
      title: `${oldUnmatched.length} unmatched transaction${oldUnmatched.length > 1 ? "s are" : " is"} older than 7 days`,
      description:
        "These have been sitting unprocessed. Run reconciliation to attempt automatic matching, or review them manually.",
      priority: "medium",
      icon: "clock",
      actionLabel: "View Transactions",
      actionHref: "/transactions",
    });
  }

  // 3. Reconciliation rate trend
  const reconRate =
    counts.total > 0
      ? Math.round(((counts.autoMatched + counts.reviewed) / counts.total) * 100)
      : 0;

  if (reconRate >= 90) {
    insights.push({
      id: "high-recon-rate",
      kind: "trend",
      title: `${reconRate}% reconciliation rate — excellent!`,
      description:
        "Almost all your transactions are matched. Your books are in great shape.",
      priority: "low",
      icon: "check",
    });
  } else if (reconRate < 50 && counts.total > 0) {
    insights.push({
      id: "low-recon-rate",
      kind: "alert",
      title: `Only ${reconRate}% of transactions are reconciled`,
      description:
        "More than half your transactions are unmatched. Try running reconciliation or importing your latest ledger entries.",
      priority: "high",
      icon: "warning",
      actionLabel: "Run Reconciliation",
      actionHref: "/dashboard",
    });
  }

  // 4. Cash flow projection warning
  if (forecast.summary.projectedEndingCashDelta < 0) {
    insights.push({
      id: "cash-burn",
      kind: "alert",
      title: "Cash flow trending negative",
      description: `Based on your reconciled data, your projected cash position will decrease by $${Math.abs(
        forecast.summary.projectedEndingCashDelta
      ).toLocaleString(undefined, { minimumFractionDigits: 2 })} over the next ${forecast.horizonDays} days.`,
      priority: "medium",
      icon: "dollar",
      actionLabel: "View Forecast",
      actionHref: "/forecast",
    });
  }

  // 5. Vendor anomaly alerts
  const anomalyNotifications = notifications.filter(
    (n) => n.kind === "anomaly" && !n.readAt
  );
  if (anomalyNotifications.length > 0) {
    const vendorMentions = anomalyNotifications
      .map((n) => {
        const match = n.message.match(/^(.+?)\s\d/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    const uniqueVendors = [...new Set(vendorMentions)].slice(0, 3);

    if (uniqueVendors.length > 0) {
      insights.push({
        id: "vendor-anomalies",
        kind: "alert",
        title: `Unusual charges detected from ${uniqueVendors.join(", ")}`,
        description:
          "These charges deviate significantly from the vendor's historical pattern. This could be a billing error or a new service tier.",
        priority: "high",
        icon: "warning",
        actionLabel: "Review Anomalies",
        actionHref: "/reconcile",
      });
    }
  }

  // 6. New vendor patterns learned
  const newPatterns = vendorPatterns.filter((p) => p.sampleSize === 3);
  if (newPatterns.length > 0) {
    insights.push({
      id: "new-baselines",
      kind: "tip",
      title: `${newPatterns.length} new vendor baseline${newPatterns.length > 1 ? "s" : ""} established`,
      description: `ReconAI has learned enough about ${newPatterns.map((p) => p.vendorName).join(", ")} to automatically flag anomalies. Future charges outside their typical range will be flagged.`,
      priority: "low",
      icon: "trending",
    });
  }

  // 7. Empty state — no data yet
  if (counts.total === 0) {
    insights.push({
      id: "get-started",
      kind: "tip",
      title: "Get started by importing your data",
      description:
        "Import your bank transactions and ledger entries to begin reconciliation. You can upload a CSV file or load demo data to explore the platform.",
      priority: "high",
      icon: "info",
      actionLabel: "Import Data",
      actionHref: "/transactions",
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
