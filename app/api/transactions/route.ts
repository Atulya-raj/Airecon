import { withOrg } from "@/lib/api";
import { getReconStore } from "@/lib/recon/store";
import type { TransactionStatus } from "@/lib/recon/types";

const STATUSES: TransactionStatus[] = [
  "unmatched",
  "auto_matched",
  "reviewed",
  "anomalous",
];

export async function GET(request: Request) {
  return withOrg(request, async (session) => {
    const store = getReconStore();
    const requested = new URL(request.url).searchParams.get("status");
    const status = STATUSES.find((s) => s === requested);

    const [transactions, matches] = await Promise.all([
      store.listTransactions(session.orgId, { status, limit: 200 }),
      store.listMatches(session.orgId),
    ]);

    const latestMatch = new Map<string, (typeof matches)[number]>();
    for (const match of matches) {
      if (!latestMatch.has(match.transactionId)) {
        latestMatch.set(match.transactionId, match);
      }
    }

    return Response.json({
      transactions: transactions.map((transaction) => ({
        transaction,
        match: latestMatch.get(transaction.id) ?? null,
      })),
    });
  });
}
