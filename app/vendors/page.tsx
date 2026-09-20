import { requireAuthSession } from "@/lib/auth-session";
import { getReconStore } from "@/lib/recon/store";
import { VendorsClient } from "./VendorsClient";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const session = await requireAuthSession();
  const orgId = session.orgId;
  const store = getReconStore();

  const [vendorPatterns, transactions] = await Promise.all([
    store.listVendorPatterns(orgId),
    store.listTransactions(orgId, { limit: 200 }),
  ]);

  const anomalousCount = transactions.filter((t) => t.status === "anomalous").length;

  return (
    <VendorsClient
      vendorPatterns={vendorPatterns}
      anomalousCount={anomalousCount}
      orgId={orgId}
    />
  );
}
