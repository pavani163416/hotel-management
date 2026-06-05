import { useCurrency, Currency } from "@/context/CurrencyContext";

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "USD", label: "$ USD" },
  { code: "INR", label: "₹ INR" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "AED", label: "د.إ AED" },
  { code: "AUD", label: "A$ AUD" },
  { code: "SGD", label: "S$ SGD" },
];

const CurrencySwitcher = () => {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as Currency)}
      aria-label="Select currency"
      className="text-xs font-medium border border-border rounded-lg px-2 py-1.5 bg-background text-primary outline-none focus:border-accent cursor-pointer"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>{c.label}</option>
      ))}
    </select>
  );
};

export default CurrencySwitcher;
