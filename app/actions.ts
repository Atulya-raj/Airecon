"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionOrgId } from "@/lib/org";
import {
  authenticateUser,
  clearServerSession,
  setServerSession,
} from "@/lib/auth-session";
import {
  demoLedgerEntries,
  demoTransactions,
  demoVendorHistory,
} from "@/lib/recon/demo-data";
import { confirmMatch, runReconciliation } from "@/lib/recon/pipeline";
import { getReconStore } from "@/lib/recon/store";

export async function loginAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  const result = authenticateUser(username, password);
  if (!result.success || !result.session) {
    return { success: false, error: result.error || "Authentication failed." };
  }

  await setServerSession(result.session);

  // If test user atulya, ensure their isolated demo data is initialized
  if (result.session.isTestUser) {
    const orgId = result.session.orgId;
    const store = getReconStore();
    const existing = await store.listTransactions(orgId, { limit: 1 });
    if (existing.length === 0) {
      await store.insertLedgerEntries(orgId, demoLedgerEntries(orgId));
      await store.upsertTransactions(orgId, [
        ...demoVendorHistory(orgId),
        ...demoTransactions(orgId),
      ]);
      await runReconciliation({ orgId });
    }
  }

  return { success: true };
}

export async function logoutAction(): Promise<void> {
  await clearServerSession();
  redirect("/login");
}

export async function seedDemoDataAction(): Promise<void> {
  const orgId = await getSessionOrgId();
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
  const orgId = await getSessionOrgId();
  await runReconciliation({ orgId });
  revalidatePath("/");
}

export async function confirmMatchAction(formData: FormData): Promise<void> {
  const orgId = await getSessionOrgId();
  const transactionId = String(formData.get("transactionId"));
  const rawLedgerEntryId = formData.get("ledgerEntryId");
  const ledgerEntryId =
    typeof rawLedgerEntryId === "string" && rawLedgerEntryId.length > 0
      ? rawLedgerEntryId
      : null;

  await confirmMatch({
    orgId,
    transactionId,
    ledgerEntryId,
    userId: "ui-user",
    note: ledgerEntryId ? "Confirmed in review queue" : "Dismissed in review queue",
  });
  revalidatePath("/");
}

export async function saveConfigAction(formData: FormData): Promise<void> {
  const orgId = await getSessionOrgId();
  const store = getReconStore();

  const autoMatch = formData.get("autoMatchThreshold");
  const bandFloor = formData.get("ambiguousBandFloor");
  const tolPct = formData.get("amountTolerancePct");
  const tolFlat = formData.get("amountToleranceFlat");
  const dateWindow = formData.get("dateWindowDays");
  const zScore = formData.get("anomalyZScoreThreshold");
  const tieEps = formData.get("tieEpsilon");

  await store.saveConfig(orgId, {
    ...(autoMatch ? { autoMatchThreshold: parseFloat(autoMatch as string) } : {}),
    ...(bandFloor ? { ambiguousBandFloor: parseFloat(bandFloor as string) } : {}),
    ...(tolPct ? { amountTolerancePct: parseFloat(tolPct as string) / 100 } : {}),
    ...(tolFlat ? { amountToleranceFlat: parseFloat(tolFlat as string) } : {}),
    ...(dateWindow ? { dateWindowDays: parseInt(dateWindow as string, 10) } : {}),
    ...(zScore ? { anomalyZScoreThreshold: parseFloat(zScore as string) } : {}),
    ...(tieEps ? { tieEpsilon: parseFloat(tieEps as string) } : {}),
  });
  revalidatePath("/");
}

export async function resetDemoDataAction(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const fs = await import("fs");
    const path = await import("path");
    const localDbPath = path.resolve(process.cwd(), ".local-recon-db.json");
    if (fs.existsSync(localDbPath)) {
      fs.unlinkSync(localDbPath);
    }
  }
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/reconcile");
  revalidatePath("/vendors");
  revalidatePath("/forecast");
}

export async function createManualTransactionAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const orgId = await getSessionOrgId();
  const store = getReconStore();

  const txnDate = String(formData.get("txnDate") || new Date().toISOString().slice(0, 10));
  const payeeRaw = String(formData.get("payeeRaw") || "Manual Transaction");
  const amountStr = String(formData.get("amount") || "0");
  const amount = Math.abs(parseFloat(amountStr));
  const currency = (String(formData.get("currency") || "USD")) as "USD" | "INR" | "EUR" | "GBP";
  const memo = formData.get("memo") ? String(formData.get("memo")) : null;
  const accountId = String(formData.get("accountId") || "manual-entry");

  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "Amount must be a positive number" };
  }

  await store.upsertTransactions(orgId, [
    {
      orgId,
      accountId,
      amount,
      currency,
      txnDate,
      payeeRaw,
      memo,
      externalId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: "unmatched",
    },
  ]);

  await store.insertNotification({
    orgId,
    kind: "forecast_update",
    transactionId: null,
    message: `Added manual bank transaction for ${payeeRaw} (${currency} ${amount.toFixed(2)}).`,
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reconcile");
  return { success: true };
}

export async function createManualLedgerEntryAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const orgId = await getSessionOrgId();
  const store = getReconStore();

  const entryDate = String(formData.get("entryDate") || new Date().toISOString().slice(0, 10));
  const vendorName = formData.get("vendorName") ? String(formData.get("vendorName")) : null;
  const amountStr = String(formData.get("amount") || "0");
  const amount = Math.abs(parseFloat(amountStr));
  const currency = (String(formData.get("currency") || "USD")) as "USD" | "INR" | "EUR" | "GBP";
  const memo = formData.get("memo") ? String(formData.get("memo")) : null;
  const entryType = (String(formData.get("entryType") || "expense")) as "invoice" | "expense" | "refund";

  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "Amount must be a positive number" };
  }

  await store.insertLedgerEntries(orgId, [
    {
      orgId,
      amount,
      currency,
      entryDate,
      vendorName,
      memo,
      entryType,
      externalId: `manual-ledg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    },
  ]);

  await store.insertNotification({
    orgId,
    kind: "forecast_update",
    transactionId: null,
    message: `Added manual ${entryType} ledger entry for ${vendorName || "vendor"} (${currency} ${amount.toFixed(2)}).`,
  });

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/reconcile");
  return { success: true };
}

