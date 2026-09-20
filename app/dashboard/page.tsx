import { requireAuthSession } from "@/lib/auth-session";
import { getReconStore } from "@/lib/recon/store";
import { generateCashFlowForecast } from "@/lib/recon/forecast";
import { generateInsights } from "@/lib/recon/insights";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuthSession();
  const orgId = session.orgId;
  const store = getReconStore();

  const [
    transactions,
    matches,
    notifications,
    config,
    vendorPatterns,
    reconciledFlows,
  ] = await Promise.all([
    store.listTransactions(orgId, { limit: 200 }),
    store.listMatches(orgId),
    store.listNotifications(orgId, 50),
    store.getConfig(orgId),
    store.listVendorPatterns(orgId),
    store.listReconciledFlows(orgId),
  ]);

  const counts = {
    total: transactions.length,
    autoMatched: transactions.filter((t) => t.status === "auto_matched").length,
    reviewed: transactions.filter((t) => t.status === "reviewed").length,
    anomalous: transactions.filter((t) => t.status === "anomalous").length,
    unmatched: transactions.filter((t) => t.status === "unmatched").length,
  };

  const forecast = generateCashFlowForecast(reconciledFlows, {
    orgId,
    horizonDays: 30,
  });

  const insights = generateInsights({
    transactions,
    matches,
    vendorPatterns,
    notifications,
    forecast,
    config,
    counts,
  });

  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
  const reconRate =
    counts.total > 0
      ? Math.round(((counts.autoMatched + counts.reviewed) / counts.total) * 100)
      : 0;

  return (
    <DashboardClient
      orgId={config.orgId}
      counts={counts}
      totalVolume={totalVolume}
      reconRate={reconRate}
      forecast={forecast}
      insights={insights}
      anomalousCount={counts.anomalous}
      recentNotifications={notifications.slice(0, 8)}
    />
  );
}
