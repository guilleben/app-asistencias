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
 * - base: turnos presentes × (precio día / 2)
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
      prisma.attendance.groupBy({
        by: ["employeeId"],
        where: {
          present: true,
          date: { gte: isoToDb(weekStart), lte: isoToDb(weekEnd) },
        },
        _count: { _all: true },
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

  const shiftsByEmployee = new Map(
    attendances.map((a) => [a.employeeId, a._count._all]),
  );
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
    const dailyRate = Number(employee.category.dailyRate);
    const baseAmount = shiftsPresent * (dailyRate / 2);

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
      dailyRate,
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
