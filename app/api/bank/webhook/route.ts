import { getReconStore } from "@/lib/recon/store";
import { runReconciliation } from "@/lib/recon/pipeline";
import { cleanPaymentNarration } from "@/lib/recon/currency";
import type { NewTransaction } from "@/lib/recon/store/types";

/**
 * Incoming Bank Webhook Handler:
 * Accepts real-time transaction event webhooks from RazorpayX, RBI Account Aggregators,
 * Plaid, or direct core banking webhooks.
 */
export async function POST(request: Request) {
  try {
    let payload: Record<string, unknown>;
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Determine target org from query param, header, or payload
    const url = new URL(request.url);
    const orgId =
      url.searchParams.get("orgId") ||
      request.headers.get("x-org-id") ||
      (typeof payload.orgId === "string" ? payload.orgId : "org-atulya");

    const store = getReconStore();

    // Standardized extraction
    const rawPayee = String(payload.payee || payload.narrative || payload.description || "Realtime Bank Wire");
    const cleaned = cleanPaymentNarration(rawPayee);
    const amount = Math.abs(parseFloat(String(payload.amount || "0")));
    const currency = (String(payload.currency || "INR").toUpperCase()) as "USD" | "INR" | "EUR" | "GBP";
    const txnDate = String(payload.date || new Date().toISOString().slice(0, 10));
    const accountId = String(payload.account || payload.bank || "live-feed");
    const externalId = String(payload.id || payload.utr || `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

    if (isNaN(amount) || amount <= 0) {
      return Response.json({ error: "Invalid transaction amount" }, { status: 400 });
    }

    const newTxn: NewTransaction = {
      orgId,
      accountId,
      amount,
      currency,
      txnDate,
      payeeRaw: cleaned.cleanPayee,
      memo: cleaned.utr ? `Live Webhook [UTR: ${cleaned.utr}]` : "Live Webhook Ingested",
      externalId,
      status: "unmatched",
    };

    await store.upsertTransactions(orgId, [newTxn]);

    // Instantly reconcile in real-time
    const recon = await runReconciliation({ orgId });

    await store.insertNotification({
      orgId,
      kind: "forecast_update",
      transactionId: null,
      message: `Live Webhook processed: ${currency} ${amount} from ${cleaned.cleanPayee} (${recon.autoMatched > 0 ? "Matched immediately" : "Queued for review"}).`,
    });

    return Response.json({
      received: true,
      orgId,
      transactionId: externalId,
      status: recon.autoMatched > 0 ? "auto_matched" : "unmatched",
    });
  } catch (error) {
    console.error("Bank webhook processing error:", error);
    return Response.json({ error: "Internal processing error" }, { status: 500 });
  }
}
