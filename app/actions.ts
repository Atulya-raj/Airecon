"use server";

import { revalidatePath } from "next/cache";
import { getUiOrgId } from "@/lib/org";
import {
  demoLedgerEntries,
  demoTransactions,
  demoVendorHistory,
} from "@/lib/recon/demo-data";
import { confirmMatch, runReconciliation } from "@/lib/recon/pipeline";
import { getReconStore } from "@/lib/recon/store";

export async function seedDemoDataAction(): Promise<void> {
  const orgId = getUiOrgId();
  const store = getReconStore();
  const existing = await store.listTransactions(orgId, { limit: 1 });
  if (existing.length === 0) {
    await store.insertLedgerEntries(orgId, demoLedgerEntries(orgId));
    await store.upsertTransactions(orgId, [
      ...demoVendorHistory(orgId),
      ...demoTransactions(orgId),
    ]);
  }
  revalidatePath("/");
}

export async function runReconciliationAction(): Promise<void> {
  await runReconciliation({ orgId: getUiOrgId() });
  revalidatePath("/");
}

export async function confirmMatchAction(formData: FormData): Promise<void> {
  const transactionId = String(formData.get("transactionId"));
  const rawLedgerEntryId = formData.get("ledgerEntryId");
  const ledgerEntryId =
    typeof rawLedgerEntryId === "string" && rawLedgerEntryId.length > 0
      ? rawLedgerEntryId
      : null;

  await confirmMatch({
    orgId: getUiOrgId(),
    transactionId,
    ledgerEntryId,
    userId: "ui-user",
    note: ledgerEntryId ? "Confirmed in review queue" : "Dismissed in review queue",
  });
  revalidatePath("/");
}
