import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { RetroManager } from "@/components/retro/retro-manager";
import { Button } from "@/components/ui/button";
import { monthNameEs, parseIsoParts, todayIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RetroactivosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const today = parseIsoParts(todayIso());
  const month = Number(params.month) >= 1 && Number(params.month) <= 12
    ? Number(params.month)
    : today.month;
  const year = Number(params.year) >= 2020 ? Number(params.year) : today.year;

  const prevMonth = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const nextMonth = month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };

  const [employees, retroactives] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.retroactive.findMany({ where: { month, year } }),
  ]);

  const retroByEmployee = new Map(retroactives.map((r) => [r.employeeId, r]));

  return (
    <div>
      <PageHeader title="Retroactivos" description="Activá por empleado y mes">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            render={
              <Link
                href={`/retroactivos?month=${prevMonth.month}&year=${prevMonth.year}`}
              />
            }
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-28 text-center text-sm font-medium capitalize">
            {monthNameEs(month)} {year}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            render={
              <Link
                href={`/retroactivos?month=${nextMonth.month}&year=${nextMonth.year}`}
              />
            }
          >
            <ChevronRight />
          </Button>
        </div>
      </PageHeader>

      <RetroManager
        month={month}
        year={year}
        employees={employees.map((e) => {
          const retro = retroByEmployee.get(e.id);
          return {
            id: e.id,
            name: `${e.lastName}, ${e.firstName}`,
            categoryRetroWeekly: Number(e.category.retroWeekly),
            retro: retro
              ? {
                  id: retro.id,
                  active: retro.active,
                  frequency: retro.frequency,
                  weeklyAmount: Number(retro.weeklyAmount),
                }
              : null,
          };
        })}
      />
    </div>
  );
}
