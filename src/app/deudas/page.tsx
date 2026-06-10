import { DebtHistory } from "@/components/debts/debt-history";
import { DebtManager } from "@/components/debts/debt-manager";
import { PageHeader } from "@/components/page-header";
import { dbToIso } from "@/lib/dates";
import { computeBalanceAfterById } from "@/lib/debts";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DeudasPage() {
  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      debtMovements: {
        orderBy: { date: "desc" },
        include: {
          payment: { select: { weekStart: true } },
        },
      },
    },
  });

  const employeeRows = employees.map((e) => {
    const movements = e.debtMovements.map((m) => ({
      id: m.id,
      amount: Number(m.amount),
      note: m.note,
      date: m.date.toISOString(),
      fromPayment: m.paymentId !== null,
      paymentWeekStart: m.payment ? dbToIso(m.payment.weekStart) : null,
    }));
    const balanceAfterById = computeBalanceAfterById(movements);

    return {
      id: e.id,
      name: `${e.lastName}, ${e.firstName}`,
      balance: movements.reduce((acc, m) => acc + m.amount, 0),
      movements: movements.map((m) => ({
        ...m,
        balanceAfter: balanceAfterById.get(m.id) ?? 0,
      })),
    };
  });

  const history = employeeRows
    .flatMap((employee) =>
      employee.movements.map((movement) => ({
        ...movement,
        employeeId: employee.id,
        employeeName: employee.name,
      })),
    )
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Deudas"
        description="Préstamos, pagos y saldos por empleado"
      />
      <DebtManager employees={employeeRows} />
      <DebtHistory
        items={history}
        employees={employeeRows.map(({ id, name }) => ({ id, name }))}
      />
    </div>
  );
}
