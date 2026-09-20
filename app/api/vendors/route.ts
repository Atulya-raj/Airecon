import { withOrg } from "@/lib/api";
import { getReconStore } from "@/lib/recon/store";

export async function GET(request: Request) {
  return withOrg(request, async (session) => {
    const store = getReconStore();
    const patterns = await store.listVendorPatterns(session.orgId);
    return Response.json({
      vendors: patterns.map((p) => ({
        id: p.id,
        vendorName: p.vendorName,
        avgAmount: p.avgAmount,
        amountStddev: p.amountStddev,
        typicalIntervalDays: p.typicalIntervalDays,
        sampleSize: p.sampleSize,
        lastUpdated: p.lastUpdated,
      })),
    });
  });
}
