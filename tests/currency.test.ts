import { describe, expect, it } from "vitest";
import {
  formatIndianNumber,
  formatCurrency,
  parseCurrencyAmount,
  cleanPaymentNarration,
} from "../lib/recon/currency";

describe("Indian and Global Currency & Banking Utilities", () => {
  describe("formatIndianNumber", () => {
    it("formats thousands without change up to 999", () => {
      expect(formatIndianNumber(500)).toBe("500.00");
    });

    it("formats Lakhs correctly (e.g. 1,50,000.00)", () => {
      expect(formatIndianNumber(150000)).toBe("1,50,000.00");
    });

    it("formats Crores correctly (e.g. 1,23,45,678.00)", () => {
      expect(formatIndianNumber(12345678)).toBe("1,23,45,678.00");
    });

    it("handles negative values in Indian numbering", () => {
      expect(formatIndianNumber(-2500000)).toBe("-25,00,000.00");
    });
  });

  describe("formatCurrency", () => {
    it("formats standard USD with $ and comma thousands", () => {
      expect(formatCurrency(1500, "USD")).toBe("$1,500.00");
    });

    it("formats INR with ₹ and Indian grouping", () => {
      expect(formatCurrency(150000, "INR")).toBe("₹1,50,000.00");
    });

    it("formats EUR and GBP correctly", () => {
      expect(formatCurrency(2450.5, "EUR")).toBe("€2,450.50");
      expect(formatCurrency(3100, "GBP")).toBe("£3,100.00");
    });

    it("formats compact INR with Lakhs (L) and Crores (Cr)", () => {
      expect(formatCurrency(250000, "INR", { compact: true })).toBe("₹2.50 L");
      expect(formatCurrency(15000000, "INR", { compact: true })).toBe("₹1.50 Cr");
    });
  });

  describe("parseCurrencyAmount", () => {
    it("parses numbers from messy strings", () => {
      expect(parseCurrencyAmount("₹ 1,50,000.00").amount).toBe(150000);
      expect(parseCurrencyAmount("$ 4,250.75").amount).toBe(4250.75);
    });

    it("detects Dr and Cr indicators", () => {
      const dr = parseCurrencyAmount("1,200.00 Dr");
      expect(dr.amount).toBe(1200);
      expect(dr.type).toBe("debit");

      const cr = parseCurrencyAmount("5,000.00 Cr");
      expect(cr.amount).toBe(5000);
      expect(cr.type).toBe("credit");
    });
  });

  describe("cleanPaymentNarration", () => {
    it("extracts payee and UTR from Indian UPI narration", () => {
      const result = cleanPaymentNarration(
        "UPI/428192841920/AMAZON SELLER/paytm-182@paytm/Payment for goods"
      );
      expect(result.cleanPayee).toBe("AMAZON SELLER");
      expect(result.utr).toBe("428192841920");
      expect(result.mode).toBe("UPI");
    });

    it("extracts payee and UTR from Indian NEFT narration", () => {
      const result = cleanPaymentNarration("NEFT-N1234567890-INFOSYS LIMITED-SALARY");
      expect(result.cleanPayee).toBe("INFOSYS LIMITED");
      expect(result.utr).toBe("N1234567890");
      expect(result.mode).toBe("NEFT");
    });

    it("extracts payee from POS card swipe", () => {
      const result = cleanPaymentNarration("POS 4012XXXXXXXX1234 STARBUCKS BANGALORE");
      expect(result.cleanPayee).toBe("STARBUCKS BANGALORE");
      expect(result.mode).toBe("CARD");
    });

    it("falls back gracefully for standard strings", () => {
      const result = cleanPaymentNarration("Amazon Web Services");
      expect(result.cleanPayee).toBe("Amazon Web Services");
      expect(result.mode).toBe("OTHER");
    });
  });
});
