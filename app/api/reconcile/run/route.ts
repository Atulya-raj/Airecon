import { z } from "zod";
import { badRequest, withOrg } from "@/lib/api";
import { runReconciliation } from "@/lib/recon/pipeline";

const bodySchema = z.object({
  transactionIds: z.array(z.string()).max(500).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export async function POST(request: Request) {
  return withOrg(
    request,
    async (session) => {
      const raw = await request.text();
      const parsed = bodySchema.safeParse(raw ? JSON.parse(raw) : {});
      if (!parsed.success) return badRequest(parsed.error.flatten());

      const result = await runReconciliation({
        orgId: session.orgId,
        transactionIds: parsed.data.transactionIds,
        limit: parsed.data.limit,
      });

      return Response.json({
        processed: result.processed,
        autoMatched: result.autoMatched,
        ruleMatched: result.ruleMatched,
        anomalous: result.anomalous,
        decisions: result.decisions.map((d) => ({
          transactionId: d.transactionId,
          outcome: d.outcome,
          rationale: d.rationale,
          confidence: d.match?.confidenceScore ?? null,
          topScore: d.candidates[0]?.score ?? null,
        })),
      });
    },
    { limit: 20 }
  );
}
