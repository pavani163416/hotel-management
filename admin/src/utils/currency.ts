const LOCALES: Record<string, string> = {
  USD: "en-US",
  INR: "en-IN",
  EUR: "de-DE",
  GBP: "en-GB",
  AED: "en-AE",
  AUD: "en-AU",
  SGD: "en-SG",
};

export function formatCurrency(
  amount: number,
  currency = "USD",
  opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number; locale?: string }
) {
  const locale = opts?.locale ?? LOCALES[currency] ?? "en-US";
  const hasFraction = Math.round(amount * 100) % 100 !== 0;
  const minimumFractionDigits = opts?.minimumFractionDigits ?? (hasFraction ? 2 : 0);
  const maximumFractionDigits = opts?.maximumFractionDigits ?? (hasFraction ? 2 : 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function currencySymbol(currency: string) {
  const locale = LOCALES[currency] ?? "en-US";
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value || currency;
  } catch {
    return currency;
  }
}
