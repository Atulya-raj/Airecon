import { requireAuthSession } from "@/lib/auth-session";
import { getReconStore } from "@/lib/recon/store";
import { BankFeedsClient } from "./BankFeedsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bank Feeds & Real-Time Sync — AI-Recon",
  description: "Connect Indian and Global bank feeds with real-time transaction tracking and webhook ingestion.",
};

export default async function BankFeedsPage() {
  const session = await requireAuthSession();
  const orgId = session.orgId;
  const store = getReconStore();

  const [transactions, notifications] = await Promise.all([
    store.listTransactions(orgId, { limit: 100 }),
    store.listNotifications(orgId, 25),
  ]);

  const anomalousCount = transactions.filter((t) => t.status === "anomalous").length;

  return (
    <BankFeedsClient
      orgId={orgId}
      username={session.username}
      name={session.name}
      transactions={transactions}
      notifications={notifications}
      anomalousCount={anomalousCount}
    />
  );
}
