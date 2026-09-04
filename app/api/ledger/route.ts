import { z } from "zod";
import { badRequest, withOrg, withoutEmbedding } from "@/lib/api";
import { getReconStore } from "@/lib/recon/store";

const entrySchema = z.object({
  entryType: z.enum(["invoice", "expense", "refund"]),
  amount: z.number(),
  currency: z.enum(["USD", "INR", "EUR", "GBP"]).default("USD"),
  vendorName: z.string().max(200).nullable().default(null),
  memo: z.string().max(500).nullable().default(null),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bodySchema = z.object({ entries: z.array(entrySchema).min(1).max(500) });

export async function GET(request: Request) {
  return withOrg(request, async (session) => {
    const entries = await getReconStore().listOpenLedgerEntries(session.orgId);
    return Response.json({ entries: entries.map(withoutEmbedding) });
  });
}

export async function POST(request: Request) {
  return withOrg(request, async (session) => {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const entries = await getReconStore().insertLedgerEntries(
      session.orgId,
      parsed.data.entries.map((entry) => ({ ...entry, orgId: session.orgId }))
    );
    return Response.json({ entries: entries.map(withoutEmbedding) });
  });
}
