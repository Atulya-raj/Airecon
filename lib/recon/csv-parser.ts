import type { Currency, LedgerEntryType } from "./types";
import type { NewLedgerEntry, NewTransaction } from "./store/types";
import { cleanPaymentNarration } from "./currency";

export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  totalRows: number;
  detectedType: "bank" | "ledger";
  columnMapping: ColumnMapping;
}

export interface ColumnMapping {
  dateCol: number;
  amountCol: number;
  debitCol?: number;
  creditCol?: number;
  payeeCol: number;
  memoCol?: number;
  currencyCol?: number;
  typeCol?: number; // For ledger: invoice/expense/refund
}

export interface ParseValidationError {
  row: number;
  message: string;
}

/**
 * Standard RFC 4180 CSV parser handling quoted fields, commas inside quotes,
 * and multi-line fields.
 */
export function parseCSVText(csvText: string): string[][] {
  const clean = csvText.trim();
  if (!clean) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      // Only push non-empty rows
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Push last field and row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Automatically inspects column headers to determine best matching column indices.
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ""));

  let dateCol = -1;
  let amountCol = -1;
  let debitCol: number | undefined;
  let creditCol: number | undefined;
  let payeeCol = -1;
  let memoCol: number | undefined;
  let currencyCol: number | undefined;
  let typeCol: number | undefined;

  lower.forEach((header, idx) => {
    if (dateCol === -1 && (header.includes("date") || header.includes("time") || header === "dt" || header.includes("txn") || header.includes("valuedate") || header.includes("posting"))) {
      dateCol = idx;
    } else if (payeeCol === -1 && (
      header.includes("payee") ||
      header.includes("vendor") ||
      header.includes("merchant") ||
      header.includes("description") ||
      header.includes("details") ||
      header.includes("narrative") ||
      header.includes("narration") ||
      header.includes("particulars") ||
      header.includes("name") ||
      header.includes("party") ||
      header.includes("beneficiary")
    )) {
      payeeCol = idx;
    } else if (header.includes("withdrawal") || header.includes("debit") || header === "dr") {
      debitCol = idx;
    } else if (header.includes("deposit") || header.includes("credit") || header === "cr") {
      creditCol = idx;
    } else if (amountCol === -1 && (header.includes("amount") || header.includes("total") || header === "amt" || header === "net")) {
      amountCol = idx;
    } else if (memoCol === undefined && (
      header.includes("memo") ||
      header.includes("note") ||
      header.includes("ref") ||
      header.includes("remark") ||
      header.includes("chq") ||
      header.includes("cheque") ||
      header.includes("utr")
    )) {
      memoCol = idx;
    } else if (currencyCol === undefined && (header.includes("currency") || header === "curr" || header === "ccy")) {
      currencyCol = idx;
    } else if (typeCol === undefined && (header.includes("type") || header.includes("category"))) {
      typeCol = idx;
    }
  });

  // Fallbacks if not detected by name
  if (dateCol === -1 && headers.length > 0) dateCol = 0;
  if (payeeCol === -1 && headers.length > 1) payeeCol = 1;
  if (amountCol === -1 && debitCol === undefined && headers.length > 2) amountCol = 2;

  return {
    dateCol,
    amountCol,
    debitCol,
    creditCol,
    payeeCol,
    memoCol,
    currencyCol,
    typeCol,
  };
}

/**
 * Normalizes date string to YYYY-MM-DD.
 * Supports standard ISO, US (MM/DD/YYYY), Indian (DD/MM/YYYY or DD-MM-YYYY),
 * and alphanumeric dates (e.g. 15-Aug-2026).
 */
export function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // DD-MMM-YYYY (e.g. 15-Aug-2026 or 15/Aug/2026)
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const alphaMatch = clean.match(/^(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{2,4})$/);
  if (alphaMatch) {
    const day = alphaMatch[1].padStart(2, "0");
    const mStr = alphaMatch[2].toLowerCase();
    const month = monthMap[mStr];
    const year = alphaMatch[3].length === 4 ? alphaMatch[3] : `20${alphaMatch[3]}`;
    if (month) return `${year}-${month}-${day}`;
  }

  // Split by slash or hyphen
  const parts = clean.split(/[/ -]/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts;
    // YYYY/MM/DD
    if (p1.length === 4) {
      return `${p1}-${p2.padStart(2, "0")}-${p3.padStart(2, "0")}`;
    }
    const year = p3.length === 4 ? p3 : `20${p3.padStart(2, "0")}`;
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);

    // If p1 > 12, it must be DD/MM/YYYY (Indian standard)
    if (n1 > 12 && n2 <= 12) {
      return `${year}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}`;
    }
    // Default fallback: MM/DD/YYYY or DD/MM/YYYY
    // For ambiguous < 12, standard Indian banking prefers DD/MM/YYYY, but let's check format
    return `${year}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}`;
  }

  // Try standard Date parsing
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Parses numeric amount from currency string, e.g. "$1,234.50", "-€50.00", "(45.00)".
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let clean = raw.trim().replace(/[$€£₹,]/g, "");

  // Parentheses indicating negative: (100.00) -> -100.00
  if (clean.startsWith("(") && clean.endsWith(")")) {
    clean = `-${clean.slice(1, -1)}`;
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : Math.abs(num);
}

/**
 * Normalizes currency to supported Currency type.
 */
export function normalizeCurrency(raw?: string, defaultCurrency: Currency = "USD"): Currency {
  if (!raw) return defaultCurrency;
  const clean = raw.toUpperCase().trim();
  if (clean === "INR" || clean === "₹") return "INR";
  if (clean === "EUR" || clean === "€") return "EUR";
  if (clean === "GBP" || clean === "£") return "GBP";
  return "USD";
}

/**
 * Transforms parsed CSV rows into NewTransaction objects.
 */
export function mapRowsToTransactions(
  rows: string[][],
  mapping: ColumnMapping,
  defaultCurrency: Currency = "USD"
): { transactions: NewTransaction[]; errors: ParseValidationError[] } {
  const transactions: NewTransaction[] = [];
  const errors: ParseValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // account for header + 1-indexed

    const rawDate = row[mapping.dateCol];
    const date = normalizeDate(rawDate);
    if (!date) {
      errors.push({ row: rowNum, message: `Invalid date: "${rawDate || "empty"}"` });
      return;
    }

    let amount: number | null = null;
    if (mapping.debitCol !== undefined && row[mapping.debitCol]) {
      amount = parseAmount(row[mapping.debitCol]);
    } else if (mapping.creditCol !== undefined && row[mapping.creditCol]) {
      amount = parseAmount(row[mapping.creditCol]);
    } else if (mapping.amountCol !== -1 && row[mapping.amountCol]) {
      amount = parseAmount(row[mapping.amountCol]);
    }

    if (amount === null || isNaN(amount) || amount === 0) {
      errors.push({ row: rowNum, message: `Invalid or zero amount in row ${rowNum}` });
      return;
    }

    const rawPayee = mapping.payeeCol !== -1 ? row[mapping.payeeCol] || "Unknown Payee" : "Unknown Payee";
    const cleaned = cleanPaymentNarration(rawPayee);
    const payee = cleaned.cleanPayee;

    let memo = mapping.memoCol !== undefined && mapping.memoCol !== -1 ? row[mapping.memoCol] || null : null;
    if (cleaned.utr && (!memo || !memo.includes(cleaned.utr))) {
      memo = memo ? `${memo} [UTR: ${cleaned.utr}]` : `UTR: ${cleaned.utr}`;
    }

    const currency = mapping.currencyCol !== undefined && mapping.currencyCol !== -1
      ? normalizeCurrency(row[mapping.currencyCol], defaultCurrency)
      : defaultCurrency;

    transactions.push({
      orgId: "", // Will be assigned by store/action
      accountId: "imported-csv",
      amount,
      currency,
      txnDate: date,
      payeeRaw: payee,
      memo,
      externalId: `csv-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      status: "unmatched",
    });
  });

  return { transactions, errors };
}

/**
 * Transforms parsed CSV rows into NewLedgerEntry objects.
 */
export function mapRowsToLedgerEntries(
  rows: string[][],
  mapping: ColumnMapping,
  defaultCurrency: Currency = "USD"
): { entries: NewLedgerEntry[]; errors: ParseValidationError[] } {
  const entries: NewLedgerEntry[] = [];
  const errors: ParseValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;

    const rawDate = row[mapping.dateCol];
    const date = normalizeDate(rawDate);
    if (!date) {
      errors.push({ row: rowNum, message: `Invalid date: "${rawDate || "empty"}"` });
      return;
    }

    const amount = mapping.amountCol !== -1 ? parseAmount(row[mapping.amountCol]) : null;
    if (amount === null || isNaN(amount) || amount === 0) {
      errors.push({ row: rowNum, message: `Invalid or zero amount in row ${rowNum}` });
      return;
    }

    const vendorName = mapping.payeeCol !== -1 ? row[mapping.payeeCol] || null : null;
    const memo = mapping.memoCol !== undefined && mapping.memoCol !== -1 ? row[mapping.memoCol] || null : null;
    const currency = mapping.currencyCol !== undefined && mapping.currencyCol !== -1
      ? normalizeCurrency(row[mapping.currencyCol], defaultCurrency)
      : defaultCurrency;

    let entryType: LedgerEntryType = "expense";
    if (mapping.typeCol !== undefined && mapping.typeCol !== -1 && row[mapping.typeCol]) {
      const t = row[mapping.typeCol].toLowerCase();
      if (t.includes("inv") || t.includes("bill")) entryType = "invoice";
      else if (t.includes("ref")) entryType = "refund";
    }

    entries.push({
      orgId: "",
      entryDate: date,
      amount,
      currency,
      vendorName,
      memo,
      entryType,
      externalId: `csv-ledg-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    });
  });

  return { entries, errors };
}
