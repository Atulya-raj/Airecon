import { z } from "zod";
import { badRequest, withOrg } from "@/lib/api";
import { confirmMatch } from "@/lib/recon/pipeline";

const bodySchema = z.object({
  ledgerEntryId: z.string().nullable(),
  note: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/reconcile/[txnId]/confirm">
) {
  const { txnId } = await context.params;
  return withOrg(request, async (session) => {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const match = await confirmMatch({
      orgId: session.orgId,
      transactionId: txnId,
      ledgerEntryId: parsed.data.ledgerEntryId,
      userId: session.userId,
      note: parsed.data.note,
    });

    return Response.json({ match });
  });
}
