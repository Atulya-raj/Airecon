import { withOrg, withoutEmbedding } from "@/lib/api";
import { getCandidatesForReview } from "@/lib/recon/pipeline";

export async function GET(
  request: Request,
  context: RouteContext<"/api/reconcile/[txnId]/candidates">
) {
  const { txnId } = await context.params;
  return withOrg(request, async (session) => {
    const { transaction, candidates } = await getCandidatesForReview({
      orgId: session.orgId,
      transactionId: txnId,
    });

    return Response.json({
      transaction: withoutEmbedding(transaction),
      candidates: candidates.map((c) => ({
        ledgerEntry: withoutEmbedding(c.ledgerEntry),
        score: c.score,
      })),
    });
  });
}
