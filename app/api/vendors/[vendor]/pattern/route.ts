import { withOrg } from "@/lib/api";
import { computeVendorPattern, vendorKey } from "@/lib/recon/anomaly";
import { getReconStore } from "@/lib/recon/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendor: string }> }
) {
  const { vendor } = await params;
  return withOrg(request, async (session) => {
    const store = getReconStore();
    const key = vendorKey(decodeURIComponent(vendor));
    const stored = await store.getVendorPattern(session.orgId, key);
    const history = await store.listVendorHistory(session.orgId, key);

    return Response.json({
      vendor: key,
      pattern: stored ?? computeVendorPattern(session.orgId, key, history),
      sampleSize: history.length,
      history: history.map((t) => ({
        id: t.id,
        amount: t.amount,
        txnDate: t.txnDate,
        status: t.status,
      })),
    });
  });
}
