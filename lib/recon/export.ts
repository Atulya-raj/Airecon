import type { Match, Transaction, LedgerEntry } from "./types";

/**
 * Generates a CSV string from reconciliation data.
 */
export function exportTransactionsCSV(
  transactions: Transaction[],
  matches: Match[]
): string {
  const latestMatch = new Map<string, Match>();
  for (const match of matches) {
    if (!latestMatch.has(match.transactionId)) {
      latestMatch.set(match.transactionId, match);
    }
  }

  const headers = [
    "Date",
    "Payee",
    "Amount",
    "Currency",
    "Status",
    "Match Method",
    "Confidence",
    "Rationale",
    "Memo",
  ];

  const rows = transactions.map((t) => {
    const match = latestMatch.get(t.id);
    return [
      t.txnDate,
      csvEscape(t.payeeRaw ?? ""),
      t.amount.toFixed(2),
      t.currency,
      t.status,
      match?.matchMethod ?? "",
      match?.confidenceScore !== null && match?.confidenceScore !== undefined
        ? (match.confidenceScore * 100).toFixed(1) + "%"
        : "",
      csvEscape(match?.rationale ?? ""),
      csvEscape(t.memo ?? ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generates a CSV string from ledger entries.
 */
export function exportLedgerCSV(entries: LedgerEntry[]): string {
  const headers = ["Date", "Type", "Vendor", "Amount", "Currency", "Memo"];

  const rows = entries.map((e) =>
    [
      e.entryDate,
      e.entryType,
      csvEscape(e.vendorName ?? ""),
      e.amount.toFixed(2),
      e.currency,
      csvEscape(e.memo ?? ""),
    ].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generates an executive audit reconciliation CSV cross-referencing bank txns,
 * matched ledger entries, confidence score, variance, and AI decision rationale.
 */
export function exportAuditReportCSV(
  transactions: Transaction[],
  matches: Match[],
  ledgerEntries: LedgerEntry[]
): string {
  const ledgerMap = new Map<string, LedgerEntry>();
  for (const entry of ledgerEntries) {
    ledgerMap.set(entry.id, entry);
  }

  const latestMatch = new Map<string, Match>();
  for (const match of matches) {
    if (!latestMatch.has(match.transactionId)) {
      latestMatch.set(match.transactionId, match);
    }
  }

  const headers = [
    "Bank Txn Date",
    "Bank Payee",
    "Bank Amount",
    "Currency",
    "Status",
    "Matched Ledger Vendor",
    "Ledger Amount",
    "Variance",
    "Match Method",
    "Confidence Score",
    "Approved/Matched By",
    "AI Decision Rationale",
  ];

  const rows = transactions.map((t) => {
    const match = latestMatch.get(t.id);
    const ledger = match?.ledgerEntryId ? ledgerMap.get(match.ledgerEntryId) : null;
    const variance = ledger ? (t.amount - ledger.amount).toFixed(2) : "0.00";

    return [
      t.txnDate,
      csvEscape(t.payeeRaw ?? ""),
      t.amount.toFixed(2),
      t.currency,
      t.status,
      csvEscape(ledger?.vendorName ?? (match?.ledgerEntryId ? "Matched Entry" : "None")),
      ledger ? ledger.amount.toFixed(2) : "",
      variance,
      match?.matchMethod ?? "unmatched",
      match?.confidenceScore !== null && match?.confidenceScore !== undefined
        ? (match.confidenceScore * 100).toFixed(1) + "%"
        : "N/A",
      match?.matchedBy ?? "system",
      csvEscape(match?.rationale ?? "No match established"),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}


/**
 * Triggers a browser download of the CSV data.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
