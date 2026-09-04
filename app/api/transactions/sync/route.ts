import { z } from "zod";
import { badRequest, withOrg } from "@/lib/api";
import { normalizeBatch } from "@/lib/recon/ingest";
import { getReconStore } from "@/lib/recon/store";

const bodySchema = z.object({
  aggregator: z.enum(["plaid", "teller"]),
  transactions: z.array(z.unknown()).min(1).max(500),
});

export async function POST(request: Request) {
  return withOrg(request, async (session) => {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const normalized = normalizeBatch(
      parsed.data.aggregator,
      session.orgId,
      parsed.data.transactions
    );
    const stored = await getReconStore().upsertTransactions(session.orgId, normalized);

    return Response.json({
      received: parsed.data.transactions.length,
      ingested: stored.length,
      transactionIds: stored.map((t) => t.id),
    });
  });
}
