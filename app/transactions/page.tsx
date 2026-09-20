import { requireAuthSession } from "@/lib/auth-session";
import { getReconStore } from "@/lib/recon/store";
import { TransactionsClient } from "./TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await requireAuthSession();
  const orgId = session.orgId;
  const store = getReconStore();

  const [transactions, matches, openEntries] = await Promise.all([
    store.listTransactions(orgId, { limit: 200 }),
    store.listMatches(orgId),
    store.listOpenLedgerEntries(orgId),
  ]);

  const anomalousCount = transactions.filter((t) => t.status === "anomalous").length;

  return (
    <TransactionsClient
      transactions={transactions}
      matches={matches}
      openEntries={openEntries}
      anomalousCount={anomalousCount}
      orgId={orgId}
    />
  );
}
