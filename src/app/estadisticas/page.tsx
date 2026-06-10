import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addDaysIso,
  dbToIso,
  formatIsoShort,
  isoToDb,
  mondaysOfMonth,
  monthNameEs,
  parseIsoParts,
  todayIso,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatARS } from "@/lib/format";

export const dynamic = "force-dynamic";

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-2 rounded-full bg-primary"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const today = parseIsoParts(todayIso());
  const month =
    Number(params.month) >= 1 && Number(params.month) <= 12
      ? Number(params.month)
      : today.month;
  const year = Number(params.year) >= 2020 ? Number(params.year) : today.year;

  const prevMonth =
    month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const nextMonth =
    month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };

  const mondays = mondaysOfMonth(year, month);
  const monthStart = mondays[0];
  const monthEndFriday = addDaysIso(mondays[mondays.length - 1], 4);

  const [payments, attendances, debtTotal] = await Promise.all([
    prisma.payment.findMany({
      where: {
        weekStart: {
          gte: isoToDb(monthStart),
          lte: isoToDb(mondays[mondays.length - 1]),
        },
      },
      include: { employee: true },
    }),
    prisma.attendance.findMany({
      where: {
        present: true,
        date: { gte: isoToDb(monthStart), lte: isoToDb(monthEndFriday) },
      },
      include: { site: true },
    }),
    prisma.debtMovement.aggregate({ _sum: { amount: true } }),
  ]);

  const totalPaidMonth = payments.reduce(
    (acc, p) => acc + Number(p.totalPaid),
    0,
  );
  const totalDeducted = payments.reduce(
    (acc, p) => acc + Number(p.debtDeduction),
    0,
  );

  const byWeek = mondays.map((monday) => {
    const weekPayments = payments.filter(
      (p) => dbToIso(p.weekStart) === monday,
    );
    return {
      week: monday,
      total: weekPayments.reduce((acc, p) => acc + Number(p.totalPaid), 0),
      count: weekPayments.length,
    };
  });
  const maxWeek = Math.max(...byWeek.map((w) => w.total), 0);

  const bySite = new Map<
    string,
    { shifts: number; employees: Set<number> }
  >();
  for (const att of attendances) {
    const name = att.site?.name ?? "Sin obra";
    const entry = bySite.get(name) ?? { shifts: 0, employees: new Set() };
    entry.shifts += 1;
    entry.employees.add(att.employeeId);
    bySite.set(name, entry);
  }
  const siteRows = Array.from(bySite.entries())
    .map(([name, data]) => ({
      name,
      shifts: data.shifts,
      employees: data.employees.size,
    }))
    .sort((a, b) => b.shifts - a.shifts);
  const maxSite = Math.max(...siteRows.map((s) => s.shifts), 0);

  const byEmployee = new Map<string, number>();
  for (const p of payments) {
    const name = `${p.employee.lastName}, ${p.employee.firstName}`;
    byEmployee.set(name, (byEmployee.get(name) ?? 0) + Number(p.totalPaid));
  }
  const employeeRows = Array.from(byEmployee.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  const maxEmployee = Math.max(...employeeRows.map((e) => e.total), 0);

  return (
    <div>
      <PageHeader title="Estadísticas">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            render={
              <Link
                href={`/estadisticas?month=${prevMonth.month}&year=${prevMonth.year}`}
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
                href={`/estadisticas?month=${nextMonth.month}&year=${nextMonth.year}`}
              />
            }
          >
            <ChevronRight />
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card size="sm">
            <CardHeader>
              <CardDescription>Pagado en el mes</CardDescription>
              <CardTitle className="text-xl">
                {formatARS(totalPaidMonth)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardDescription>Deuda descontada</CardDescription>
              <CardTitle className="text-xl text-emerald-600">
                {formatARS(totalDeducted)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm" className="col-span-2">
            <CardHeader>
              <CardDescription>Deuda total vigente</CardDescription>
              <CardTitle className="text-xl text-destructive">
                {formatARS(Number(debtTotal._sum.amount ?? 0))}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pagos por semana</CardTitle>
            <CardDescription>Semanas del mes (lunes a viernes)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byWeek.map((week) => (
              <div key={week.week} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">
                    {formatIsoShort(week.week)} –{" "}
                    {formatIsoShort(addDaysIso(week.week, 4))}
                  </span>
                  <span className="font-medium">{formatARS(week.total)}</span>
                </div>
                <Bar value={week.total} max={maxWeek} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Turnos por obra</CardTitle>
            <CardDescription>Mes seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {siteRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin asistencias en el mes.
              </p>
            ) : (
              siteRows.map((site) => (
                <div key={site.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{site.name}</span>
                    <span className="text-muted-foreground">
                      {site.shifts} turnos · {site.employees} empleados
                    </span>
                  </div>
                  <Bar value={site.shifts} max={maxSite} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagado por empleado</CardTitle>
            <CardDescription>Mes seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {employeeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin pagos registrados en el mes.
              </p>
            ) : (
              employeeRows.map((employee) => (
                <div key={employee.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{employee.name}</span>
                    <span className="font-medium">
                      {formatARS(employee.total)}
                    </span>
                  </div>
                  <Bar value={employee.total} max={maxEmployee} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
