import { requireAuthSession } from "@/lib/auth-session";
import { getReconStore } from "@/lib/recon/store";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireAuthSession();
  const orgId = session.orgId;
  const store = getReconStore();

  const [config, transactions] = await Promise.all([
    store.getConfig(orgId),
    store.listTransactions(orgId, { limit: 200 }),
  ]);

  const anomalousCount = transactions.filter((t) => t.status === "anomalous").length;

  return (
    <SettingsClient config={config} anomalousCount={anomalousCount} />
  );
}
