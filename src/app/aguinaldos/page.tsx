import Link from "next/link";

import { AguinaldoManager } from "@/components/aguinaldos/aguinaldo-manager";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { dbToIso, mondaysOfMonth, parseIsoParts, todayIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AguinaldosPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; semester?: string }>;
}) {
  const params = await searchParams;
  const today = parseIsoParts(todayIso());
  const year = Number(params.year) >= 2020 ? Number(params.year) : today.year;
  const semester =
    params.semester === "2" ? 2 : params.semester === "1" ? 1 : today.month >= 7 ? 2 : 1;

  const payMonth = semester === 1 ? 6 : 12;
  const defaultStart = mondaysOfMonth(year, payMonth)[0];

  const [employees, aguinaldos] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.aguinaldo.findMany({ where: { year, semester } }),
  ]);

  const byEmployee = new Map(aguinaldos.map((a) => [a.employeeId, a]));

  return (
    <div>
      <PageHeader
        title="Aguinaldos"
        description={`${semester === 1 ? "Junio" : "Diciembre"} ${year}`}
      >
        <div className="flex gap-1">
          <Button
            variant={semester === 1 ? "secondary" : "outline"}
            size="sm"
            render={<Link href={`/aguinaldos?year=${year}&semester=1`} />}
          >
            Junio
          </Button>
          <Button
            variant={semester === 2 ? "secondary" : "outline"}
            size="sm"
            render={<Link href={`/aguinaldos?year=${year}&semester=2`} />}
          >
            Diciembre
          </Button>
        </div>
      </PageHeader>

      <AguinaldoManager
        year={year}
        semester={semester}
        defaultStart={defaultStart}
        employees={employees.map((e) => {
          const ag = byEmployee.get(e.id);
          return {
            id: e.id,
            name: `${e.lastName}, ${e.firstName}`,
            aguinaldo: ag
              ? {
                  id: ag.id,
                  totalAmount: Number(ag.totalAmount),
                  installments: ag.installments,
                  startDate: dbToIso(ag.startDate),
                  active: ag.active,
                }
              : null,
          };
        })}
      />
    </div>
  );
}
