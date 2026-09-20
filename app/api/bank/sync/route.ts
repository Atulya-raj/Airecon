import { withOrg } from "@/lib/api";
import { getReconStore } from "@/lib/recon/store";
import { runReconciliation } from "@/lib/recon/pipeline";
import type { NewTransaction } from "@/lib/recon/store/types";

/**
 * Live Bank Sync Endpoint:
 * Simulates fetching real-time statement line items from connected banking APIs
 * (RBI Account Aggregator, Open Banking, Plaid) and feeds them into the pipeline.
 */
export async function POST(request: Request) {
  return withOrg(request, async (session) => {
    const store = getReconStore();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const randomSuffix = Math.random().toString(36).slice(2, 6);

    // Realistic live bank transactions (both Indian and global)
    const liveFeeds: Array<Omit<NewTransaction, "orgId">> = [
      {
        accountId: "hdfc-current",
        amount: 14500.0,
        currency: "INR",
        txnDate: dateStr,
        payeeRaw: `UPI/428910482910/SWIGGY-INSTAMART/swiggy@icici/Office Snacks`,
        memo: `UPI Order Ref #SW-${randomSuffix}`,
        externalId: `bank-sync-upi-${Date.now()}-1`,
        status: "unmatched",
      },
      {
        accountId: "sbi-corporate",
        amount: 85000.0,
        currency: "INR",
        txnDate: dateStr,
        payeeRaw: `NEFT-N4928194820-INFOSYS BPO LIMITED`,
        memo: `Vendor Retainer Q3 - NEFT`,
        externalId: `bank-sync-neft-${Date.now()}-2`,
        status: "unmatched",
      },
      {
        accountId: "chase-checking",
        amount: 250.0,
        currency: "USD",
        txnDate: dateStr,
        payeeRaw: `GITHUB INC ENTERPRISE LICENSE`,
        memo: `Dev Tooling Cloud Invoice`,
        externalId: `bank-sync-chase-${Date.now()}-3`,
        status: "unmatched",
      },
    ];

    const toInsert: NewTransaction[] = liveFeeds.map((t) => ({
      ...t,
      orgId: session.orgId,
    }));

    const inserted = await store.upsertTransactions(session.orgId, toInsert);

    // Auto-run reconciliation immediately on newly synced live transactions
    const reconResult = await runReconciliation({ orgId: session.orgId });

    await store.insertNotification({
      orgId: session.orgId,
      kind: "forecast_update",
      transactionId: null,
      message: `Bank Feed Sync complete: pulled ${inserted.length} new transactions (${reconResult.autoMatched} auto-matched instantly).`,
    });

    return Response.json({
      success: true,
      syncedCount: inserted.length,
      autoMatched: reconResult.autoMatched,
      anomalous: reconResult.anomalous,
      timestamp: now.toISOString(),
    });
  });
}
