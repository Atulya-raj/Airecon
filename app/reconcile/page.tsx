import { requireAuthSession } from "@/lib/auth-session";
import { getCandidatesForReview } from "@/lib/recon/pipeline";
import { getReconStore } from "@/lib/recon/store";
import { ReconcileClient } from "./ReconcileClient";

export const dynamic = "force-dynamic";

export default async function ReconcilePage() {
  const session = await requireAuthSession();
  const orgId = session.orgId;
  const store = getReconStore();

  const [transactions, notifications, config] = await Promise.all([
    store.listTransactions(orgId, { limit: 200 }),
    store.listNotifications(orgId, 50),
    store.getConfig(orgId),
  ]);

  const review = transactions.filter((t) => t.status === "anomalous");
  const reviewCandidates = await Promise.all(
    review.slice(0, 20).map(async (transaction) => {
      const { candidates } = await getCandidatesForReview({
        orgId,
        transactionId: transaction.id,
      });
      return { transaction, candidates };
    })
  );

  const notificationMap = new Map(
    notifications.filter((n) => n.transactionId).map((n) => [n.transactionId!, n])
  );

  const anomalousCount = review.length;

  return (
    <ReconcileClient
      reviewCandidates={reviewCandidates}
      notificationMap={Object.fromEntries(notificationMap)}
      config={config}
      anomalousCount={anomalousCount}
    />
  );
}
