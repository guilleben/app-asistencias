import { dbToIso } from "@/lib/dates";

export type BudgetPdfData = {
  owner: string;
  workName: string;
  location: string;
  date: Date;
  totalAmount: number;
  observations: string | null;
  items: { description: string }[];
};

export function formatBudgetAmountForPdf(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(rounded);
  return `$${formatted.replace(/\s/g, "")}+ IVA`;
}

export function buildBudgetPdfFilename(budget: {
  date: Date;
  owner: string;
  workName: string;
}): string {
  const month = String(budget.date.getUTCMonth() + 1).padStart(2, "0");
  const year = budget.date.getUTCFullYear();
  const owner = budget.owner.trim().toUpperCase();
  const work = budget.workName.trim();
  return `${month}-${year} Presupuesto Obra ${owner} ${work} BENASULIN.pdf`;
}

export function formatBudgetDateForPdf(date: Date): string {
  const iso = dbToIso(date);
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
