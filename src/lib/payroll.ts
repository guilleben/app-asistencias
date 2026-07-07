import {
  loadCategoryRatesMap,
  resolveCategoryRateAt,
} from "@/lib/category-rates";
import { prisma } from "@/lib/db";
import {
  addDaysIso,
  dbToIso,
  isoToDb,
  mondaysOfMonth,
  parseIsoParts,
} from "@/lib/dates";

export type PaymentSummary = {
  id: number;
  baseAmount: number;
  retroAmount: number;
  aguinaldoAmount: number;
  debtDeduction: number;
  totalPaid: number;
  notes: string | null;
  paidAt: string;
};

export type EmployeePayroll = {
  employeeId: number;
  fullName: string;
  categoryName: string;
  dailyRate: number;
  shiftsPresent: number;
  baseAmount: number;
  retroAmount: number;
  aguinaldoAmount: number;
  suggestedTotal: number;
  debtBalance: number;
  payment: PaymentSummary | null;
};

/**
 * Calcula la nómina de la semana para todos los empleados activos.
 * - base: suma por turno presente usando el precio vigente en la fecha del turno
 * - retro: semanal → cada semana del mes; mensual → total en el último lunes del mes
 * - aguinaldo: cuota si la semana cae dentro de las N cuotas desde startDate
 */
export async function getWeekPayroll(
  weekStart: string,
): Promise<EmployeePayroll[]> {
  const weekEnd = addDaysIso(weekStart, 4);
  const { year, month } = parseIsoParts(weekStart);
  const mondays = mondaysOfMonth(year, month);
  const isLastWeekOfMonth = mondays[mondays.length - 1] === weekStart;
  const weeksInMonth = mondays.length;

  const [employees, attendances, retroactives, aguinaldos, debtSums, payments] =
    await Promise.all([
      prisma.employee.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.attendance.findMany({
        where: {
          present: true,
          date: { gte: isoToDb(weekStart), lte: isoToDb(weekEnd) },
          employee: { active: true },
        },
        select: { employeeId: true, date: true },
      }),
      prisma.retroactive.findMany({
        where: { active: true, year, month },
      }),
      prisma.aguinaldo.findMany({ where: { active: true } }),
      prisma.debtMovement.groupBy({
        by: ["employeeId"],
        _sum: { amount: true },
      }),
      prisma.payment.findMany({ where: { weekStart: isoToDb(weekStart) } }),
    ]);

  const categoryIds = [...new Set(employees.map((e) => e.categoryId))];
  const ratesMap = await loadCategoryRatesMap(categoryIds);

  const baseByEmployee = new Map<number, number>();
  const shiftsByEmployee = new Map<number, number>();

  for (const attendance of attendances) {
    const employee = employees.find((e) => e.id === attendance.employeeId);
    if (!employee) continue;

    const dateIso = dbToIso(attendance.date);
    const fallback = {
      dailyRate: Number(employee.category.dailyRate),
      retroWeekly: Number(employee.category.retroWeekly),
    };
    const rate = resolveCategoryRateAt(
      ratesMap,
      employee.categoryId,
      dateIso,
      fallback,
    );

    shiftsByEmployee.set(
      attendance.employeeId,
      (shiftsByEmployee.get(attendance.employeeId) ?? 0) + 1,
    );
    baseByEmployee.set(
      attendance.employeeId,
      (baseByEmployee.get(attendance.employeeId) ?? 0) + rate.dailyRate / 2,
    );
  }

  const retroByEmployee = new Map(retroactives.map((r) => [r.employeeId, r]));
  const debtByEmployee = new Map(
    debtSums.map((d) => [d.employeeId, Number(d._sum.amount ?? 0)]),
  );
  const paymentByEmployee = new Map(payments.map((p) => [p.employeeId, p]));

  const aguinaldosByEmployee = new Map<number, typeof aguinaldos>();
  for (const ag of aguinaldos) {
    const list = aguinaldosByEmployee.get(ag.employeeId) ?? [];
    list.push(ag);
    aguinaldosByEmployee.set(ag.employeeId, list);
  }

  return employees.map((employee) => {
    const shiftsPresent = shiftsByEmployee.get(employee.id) ?? 0;
    const baseAmount = baseByEmployee.get(employee.id) ?? 0;
    const fallback = {
      dailyRate: Number(employee.category.dailyRate),
      retroWeekly: Number(employee.category.retroWeekly),
    };
    const weekRate = resolveCategoryRateAt(
      ratesMap,
      employee.categoryId,
      weekStart,
      fallback,
    );

    let retroAmount = 0;
    const retro = retroByEmployee.get(employee.id);
    if (retro) {
      if (retro.frequency === "WEEKLY") {
        retroAmount = Number(retro.weeklyAmount);
      } else if (isLastWeekOfMonth) {
        retroAmount = Number(retro.weeklyAmount) * weeksInMonth;
      }
    }

    let aguinaldoAmount = 0;
    for (const ag of aguinaldosByEmployee.get(employee.id) ?? []) {
      const startWeek = dbToIso(ag.startDate);
      for (let i = 0; i < ag.installments; i++) {
        if (addDaysIso(startWeek, i * 7) === weekStart) {
          aguinaldoAmount += Number(ag.totalAmount) / ag.installments;
        }
      }
    }

    const payment = paymentByEmployee.get(employee.id);

    return {
      employeeId: employee.id,
      fullName: `${employee.firstName} ${employee.lastName}`,
      categoryName: employee.category.name,
      dailyRate: weekRate.dailyRate,
      shiftsPresent,
      baseAmount,
      retroAmount,
      aguinaldoAmount,
      suggestedTotal: baseAmount + retroAmount + aguinaldoAmount,
      debtBalance: debtByEmployee.get(employee.id) ?? 0,
      payment: payment
        ? {
            id: payment.id,
            baseAmount: Number(payment.baseAmount),
            retroAmount: Number(payment.retroAmount),
            aguinaldoAmount: Number(payment.aguinaldoAmount),
            debtDeduction: Number(payment.debtDeduction),
            totalPaid: Number(payment.totalPaid),
            notes: payment.notes,
            paidAt: payment.paidAt.toISOString(),
          }
        : null,
    };
  });
}

export async function getDebtBalance(employeeId: number): Promise<number> {
  const result = await prisma.debtMovement.aggregate({
    where: { employeeId },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}
