import { withOrg } from "@/lib/api";
import { getReconStore } from "@/lib/recon/store";

export async function GET(request: Request) {
  return withOrg(request, async (session) => {
    const store = getReconStore();
    const [transactions, notifications] = await Promise.all([
      store.listTransactions(session.orgId, { status: "anomalous", limit: 100 }),
      store.listNotifications(session.orgId, 100),
    ]);

    const byTransaction = new Map(
      notifications
        .filter((n) => n.transactionId)
        .map((n) => [n.transactionId as string, n])
    );

    return Response.json({
      anomalies: transactions.map((transaction) => ({
        transaction,
        reason: byTransaction.get(transaction.id)?.message ?? null,
        flaggedAt: byTransaction.get(transaction.id)?.createdAt ?? transaction.createdAt,
      })),
    });
  });
}
