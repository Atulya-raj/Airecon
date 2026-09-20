import { describe, it, expect } from "vitest";
import {
  parseCSVText,
  detectColumnMapping,
  normalizeDate,
  parseAmount,
  normalizeCurrency,
  mapRowsToTransactions,
  mapRowsToLedgerEntries,
} from "../lib/recon/csv-parser";

describe("CSV Parser Utility", () => {
  it("parses standard CSV text with quoted fields containing commas", () => {
    const csv = `Date,Description,Amount,Memo
2026-09-18,"Amazon, Inc.",149.99,"Office supplies, pens"
2026-09-19,Google,12.00,GSuite`;

    const rows = parseCSVText(csv);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(["Date", "Description", "Amount", "Memo"]);
    expect(rows[1]).toEqual(["2026-09-18", "Amazon, Inc.", "149.99", "Office supplies, pens"]);
    expect(rows[2]).toEqual(["2026-09-19", "Google", "12.00", "GSuite"]);
  });

  it("handles CRLF windows line endings and trailing empty rows", () => {
    const csv = "Date,Payee,Amount\r\n2026-08-01,Stripe,500.00\r\n\r\n";
    const rows = parseCSVText(csv);
    expect(rows.length).toBe(2);
    expect(rows[1][1]).toBe("Stripe");
  });

  it("auto-detects column mappings by common financial header names", () => {
    const headers = ["Post Date", "Transaction Details", "Total Amount", "Notes"];
    const mapping = detectColumnMapping(headers);

    expect(mapping.dateCol).toBe(0);
    expect(mapping.payeeCol).toBe(1);
    expect(mapping.amountCol).toBe(2);
    expect(mapping.memoCol).toBe(3);
  });

  it("normalizes diverse date formats to ISO YYYY-MM-DD", () => {
    expect(normalizeDate("2026-09-20")).toBe("2026-09-20");
    expect(normalizeDate("09/20/2026")).toBe("2026-09-20");
    expect(normalizeDate("9/5/2026")).toBe("2026-09-05");
  });

  it("parses amounts with currency signs and negative parentheses", () => {
    expect(parseAmount("$1,250.50")).toBe(1250.5);
    expect(parseAmount("€450.00")).toBe(450.0);
    expect(parseAmount("₹72,500.00")).toBe(72500.0);
    expect(parseAmount("(120.00)")).toBe(120.0);
  });

  it("normalizes currency codes and symbols", () => {
    expect(normalizeCurrency("INR")).toBe("INR");
    expect(normalizeCurrency("₹")).toBe("INR");
    expect(normalizeCurrency("EUR")).toBe("EUR");
    expect(normalizeCurrency("€")).toBe("EUR");
    expect(normalizeCurrency("GBP")).toBe("GBP");
    expect(normalizeCurrency("£")).toBe("GBP");
    expect(normalizeCurrency(undefined, "USD")).toBe("USD");
  });

  it("transforms raw rows into NewTransaction objects with validation", () => {
    const rows = [
      ["2026-09-15", "Apple Store", "1,299.00", "MacBook Accessory"],
      ["invalid-date", "Test", "50.00", ""],
      ["2026-09-16", "Zero Corp", "0.00", ""],
    ];

    const mapping = {
      dateCol: 0,
      payeeCol: 1,
      amountCol: 2,
      memoCol: 3,
    };

    const { transactions, errors } = mapRowsToTransactions(rows, mapping, "USD");
    expect(transactions.length).toBe(1);
    expect(transactions[0].payeeRaw).toBe("Apple Store");
    expect(transactions[0].amount).toBe(1299.0);
    expect(transactions[0].currency).toBe("USD");
    expect(errors.length).toBe(2);
  });

  it("transforms raw rows into NewLedgerEntry objects with entry types", () => {
    const rows = [
      ["2026-09-10", "invoice", "Stripe Retainer", "4,500.00", "INV-101"],
      ["2026-09-11", "refund", "Vendor Return", "75.00", "REF-88"],
    ];

    const mapping = {
      dateCol: 0,
      typeCol: 1,
      payeeCol: 2,
      amountCol: 3,
      memoCol: 4,
    };

    const { entries, errors } = mapRowsToLedgerEntries(rows, mapping, "USD");
    expect(entries.length).toBe(2);
    expect(entries[0].entryType).toBe("invoice");
    expect(entries[0].amount).toBe(4500.0);
    expect(entries[1].entryType).toBe("refund");
    expect(entries[1].amount).toBe(75.0);
    expect(errors.length).toBe(0);
  });
});
