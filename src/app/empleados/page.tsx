import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { formatARS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EmpleadosPage() {
  const [employees, debtSums] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.debtMovement.groupBy({
      by: ["employeeId"],
      _sum: { amount: true },
    }),
  ]);

  const debtByEmployee = new Map(
    debtSums.map((d) => [d.employeeId, Number(d._sum.amount ?? 0)]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description={`${employees.length} activos en el sistema`}
      />
      <div className="ios-list">
        {employees.map((employee) => {
          const debt = debtByEmployee.get(employee.id) ?? 0;
          const weeklyEstimate = Number(employee.category.dailyRate) * 5;

          return (
            <div key={employee.id} className="ios-list-row">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[13px] font-semibold text-muted-foreground">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">
                  {employee.lastName}, {employee.firstName}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {employee.category.name} ·{" "}
                  {formatARS(Number(employee.category.dailyRate))}/día · est.{" "}
                  {formatARS(weeklyEstimate)}/sem
                </p>
              </div>
              {debt > 0 ? (
                <Badge variant="destructive">{formatARS(debt)}</Badge>
              ) : (
                <Badge variant="success">Al día</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
