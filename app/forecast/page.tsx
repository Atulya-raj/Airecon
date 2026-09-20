import { requireAuthSession } from "@/lib/auth-session";
import { getReconStore } from "@/lib/recon/store";
import { generateCashFlowForecast } from "@/lib/recon/forecast";
import { ForecastClient } from "./ForecastClient";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const session = await requireAuthSession();
  const orgId = session.orgId;
  const store = getReconStore();

  const [reconciledFlows, transactions] = await Promise.all([
    store.listReconciledFlows(orgId),
    store.listTransactions(orgId, { limit: 200 }),
  ]);

  const forecast = generateCashFlowForecast(reconciledFlows, {
    orgId,
    horizonDays: 30,
  });

  const anomalousCount = transactions.filter((t) => t.status === "anomalous").length;

  return (
    <ForecastClient
      initialForecast={forecast}
      anomalousCount={anomalousCount}
      orgId={orgId}
    />
  );
}
