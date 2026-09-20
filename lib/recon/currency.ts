/**
 * Currency & Banking Formatters for Indian (INR) and Global (USD, EUR, GBP) Financial Workflows.
 */

export type SupportedCurrency = "USD" | "INR" | "EUR" | "GBP";

/**
 * Formats a number in the Indian numbering system (Lakhs / Crores)
 * e.g., 150000 -> "1,50,000.00", 12345678 -> "1,23,45,678.00"
 */
export function formatIndianNumber(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const fixed = absNum.toFixed(2);
  const [intPart, decPart] = fixed.split(".");

  if (intPart.length <= 3) {
    return (isNegative ? "-" : "") + intPart + "." + decPart;
  }

  // Last 3 digits
  const last3 = intPart.slice(-3);
  const remaining = intPart.slice(0, -3);

  // Remaining digits are grouped in pairs of 2 from right to left
  const pairs = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return (isNegative ? "-" : "") + pairs + "," + last3 + "." + decPart;
}

/**
 * Universal currency formatter supporting Indian numbering for INR
 * and Western thousand-grouping for USD, EUR, GBP.
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  options: { compact?: boolean } = {}
): string {
  const normalizedCurrency = (currency || "USD").toUpperCase();

  if (options.compact) {
    if (normalizedCurrency === "INR") {
      const abs = Math.abs(amount);
      const sign = amount < 0 ? "-" : "";
      if (abs >= 10000000) {
        return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
      }
      if (abs >= 100000) {
        return `${sign}₹${(abs / 100000).toFixed(2)} L`;
      }
      if (abs >= 1000) {
        return `${sign}₹${(abs / 1000).toFixed(1)}k`;
      }
      return `${sign}₹${abs.toFixed(2)}`;
    }

    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    const symbol = normalizedCurrency === "EUR" ? "€" : normalizedCurrency === "GBP" ? "£" : "$";
    if (abs >= 1000000) {
      return `${sign}${symbol}${(abs / 1000000).toFixed(1)}M`;
    }
    if (abs >= 1000) {
      return `${sign}${symbol}${(abs / 1000).toFixed(1)}k`;
    }
    return `${sign}${symbol}${abs.toFixed(2)}`;
  }

  if (normalizedCurrency === "INR") {
    return `₹${formatIndianNumber(amount)}`;
  }

  const symbolMap: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbolMap[normalizedCurrency] || "$";
  const absFormatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${amount < 0 ? "-" : ""}${symbol}${absFormatted}`;
}

/**
 * Parses numeric amount from messy statement strings (e.g. "1,50,000.00 Cr", "₹ 2,400.50 Dr", "-1500.00")
 */
export function parseCurrencyAmount(input: string | number): {
  amount: number;
  type?: "debit" | "credit";
} {
  if (typeof input === "number") {
    return { amount: Math.abs(input), type: input < 0 ? "debit" : "credit" };
  }

  if (!input || typeof input !== "string") {
    return { amount: 0 };
  }

  const str = input.trim();
  const isDr = /\b(dr|debit)\b/i.test(str);
  const isCr = /\b(cr|credit)\b/i.test(str);

  // Remove currency symbols, commas, quotes, Cr/Dr flags
  const cleaned = str
    .replace(/[₹$€£,]/g, "")
    .replace(/\b(dr|cr|debit|credit)\b/gi, "")
    .trim();

  const parsed = parseFloat(cleaned);
  const valid = isNaN(parsed) ? 0 : Math.abs(parsed);

  return {
    amount: valid,
    type: isDr || str.startsWith("-") ? "debit" : isCr ? "credit" : undefined,
  };
}

/**
 * Cleans Indian payment gateway narrations (UPI, NEFT, IMPS, RTGS) to extract
 * recognizable payee/vendor names and transaction reference numbers (UTR).
 */
export function cleanPaymentNarration(raw: string): {
  cleanPayee: string;
  utr?: string;
  vpa?: string;
  mode?: "UPI" | "NEFT" | "IMPS" | "RTGS" | "CARD" | "NETBANKING" | "OTHER";
} {
  if (!raw) return { cleanPayee: "Unknown" };
  const text = raw.trim();

  // 1. UPI format: UPI/428192841920/AMAZON SELLER/paytm-182@paytm/Payment
  const upiMatch = text.match(/^UPI(?:\/|-)([0-9A-Za-z]+)(?:\/|-)([^/]+)(?:\/|-)?([^/]*)/i);
  if (upiMatch) {
    const utr = upiMatch[1];
    let payee = upiMatch[2].trim();
    const possibleVpa = upiMatch[3]?.trim();

    // If payee contains / or @, clean further
    if (payee.includes("@")) {
      payee = payee.split("@")[0].replace(/[._-]/g, " ");
    }

    return {
      cleanPayee: payee || "UPI Payment",
      utr,
      vpa: possibleVpa && possibleVpa.includes("@") ? possibleVpa : undefined,
      mode: "UPI",
    };
  }

  // 2. NEFT format: NEFT-N1234567890-INFOSYS LIMITED or NEFT/SBIN0001/VENDOR NAME
  const neftMatch = text.match(/NEFT[-/]([A-Za-z0-9]+)[-/](.+)/i);
  if (neftMatch) {
    const utr = neftMatch[1];
    const payee = neftMatch[2].split(/[-/]/)[0].trim();
    return {
      cleanPayee: payee,
      utr,
      mode: "NEFT",
    };
  }

  // 3. IMPS format: IMPS/P2A/41928491823/SWIGGY/HDFC
  const impsMatch = text.match(/IMPS(?:\/|-)(?:P2A|P2P|P2M|RET)?(?:\/|-)?([0-9]+)(?:\/|-)(.+)/i);
  if (impsMatch) {
    const utr = impsMatch[1];
    const payee = impsMatch[2].split(/[-/]/)[0].trim();
    return {
      cleanPayee: payee,
      utr,
      mode: "IMPS",
    };
  }

  // 4. RTGS format: RTGS/HDFC000123/TATA CONSULTANCY
  const rtgsMatch = text.match(/RTGS(?:\/|-)([A-Za-z0-9]+)(?:\/|-)(.+)/i);
  if (rtgsMatch) {
    const utr = rtgsMatch[1];
    const payee = rtgsMatch[2].split(/[-/]/)[0].trim();
    return {
      cleanPayee: payee,
      utr,
      mode: "RTGS",
    };
  }

  // 5. Card swipe POS: POS 4012XXXXXXXX1234 STARBUCKS BANGALORE
  const posMatch = text.match(/POS\s+[0-9Xx*]+\s+(.+)/i);
  if (posMatch) {
    return {
      cleanPayee: posMatch[1].trim(),
      mode: "CARD",
    };
  }

  return {
    cleanPayee: text,
    mode: "OTHER",
  };
}
