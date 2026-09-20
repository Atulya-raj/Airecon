import { z } from "zod";
import { badRequest, withOrg } from "@/lib/api";
import { getReconStore } from "@/lib/recon/store";

const configPatchSchema = z.object({
  autoMatchThreshold: z.number().min(0.5).max(1.0).optional(),
  ambiguousBandFloor: z.number().min(0.1).max(0.99).optional(),
  topK: z.number().int().min(1).max(20).optional(),
  tieEpsilon: z.number().min(0.001).max(0.1).optional(),
  amountTolerancePct: z.number().min(0).max(0.2).optional(),
  amountToleranceFlat: z.number().min(0).max(1000).optional(),
  dateWindowDays: z.number().int().min(1).max(60).optional(),
  anomalyZScoreThreshold: z.number().min(1).max(10).optional(),
  anomalyIntervalFactor: z.number().min(1).max(10).optional(),
  ruleMatchConfidence: z.number().min(0.5).max(0.99).optional(),
});

export async function GET(request: Request) {
  return withOrg(request, async (session) => {
    const store = getReconStore();
    const config = await store.getConfig(session.orgId);
    return Response.json({ config });
  });
}

export async function PATCH(request: Request) {
  return withOrg(request, async (session) => {
    const body = await request.json();
    const parsed = configPatchSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten());

    const store = getReconStore();
    const updated = await store.saveConfig(session.orgId, parsed.data);
    return Response.json({ config: updated });
  });
}
