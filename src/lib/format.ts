const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const amountInputFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatARS(amount: number): string {
  return arsFormatter.format(amount);
}

export function formatAmountInputFromNumber(amount: number): string {
  return amountInputFormatter.format(amount);
}

export function formatAmountInputFromDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return "";
  return amountInputFormatter.format(Number(clean) / 100);
}

export function parseAmountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}
