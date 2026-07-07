import { dbToIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

export type CategoryRateRow = {
  categoryId: number;
  dailyRate: number;
  retroWeekly: number;
  effectiveFrom: string;
};

export type ResolvedCategoryRate = {
  dailyRate: number;
  retroWeekly: number;
};

export function getCategoryRateAt(
  rates: CategoryRateRow[],
  dateIso: string,
): ResolvedCategoryRate | null {
  let best: CategoryRateRow | null = null;

  for (const rate of rates) {
    if (rate.effectiveFrom <= dateIso) {
      if (!best || rate.effectiveFrom > best.effectiveFrom) {
        best = rate;
      }
    }
  }

  if (!best) return null;

  return {
    dailyRate: best.dailyRate,
    retroWeekly: best.retroWeekly,
  };
}

export function groupRatesByCategory(
  rates: CategoryRateRow[],
): Map<number, CategoryRateRow[]> {
  const map = new Map<number, CategoryRateRow[]>();

  for (const rate of rates) {
    const list = map.get(rate.categoryId) ?? [];
    list.push(rate);
    map.set(rate.categoryId, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  }

  return map;
}

export async function loadCategoryRatesMap(
  categoryIds: number[],
): Promise<Map<number, CategoryRateRow[]>> {
  if (categoryIds.length === 0) return new Map();

  const rows = await prisma.categoryRate.findMany({
    where: { categoryId: { in: categoryIds } },
    orderBy: [{ categoryId: "asc" }, { effectiveFrom: "asc" }],
  });

  return groupRatesByCategory(
    rows.map((row) => ({
      categoryId: row.categoryId,
      dailyRate: Number(row.dailyRate),
      retroWeekly: Number(row.retroWeekly),
      effectiveFrom: dbToIso(row.effectiveFrom),
    })),
  );
}

export function resolveCategoryRateAt(
  ratesMap: Map<number, CategoryRateRow[]>,
  categoryId: number,
  dateIso: string,
  fallback: ResolvedCategoryRate,
): ResolvedCategoryRate {
  const rates = ratesMap.get(categoryId) ?? [];
  return getCategoryRateAt(rates, dateIso) ?? fallback;
}

export function monthStartIso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
