import { PageHeader } from "@/components/page-header";
import { PresupuestoManager } from "@/components/presupuestos/presupuesto-manager";
import { dbToIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PresupuestosPage() {
  const budgets = await prisma.budget.findMany({
    where: { active: true },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Presupuestos"
        description="Crear, editar y descargar presupuestos en PDF"
      />
      <PresupuestoManager
        presupuestos={budgets.map((budget) => ({
          id: budget.id,
          owner: budget.owner,
          workName: budget.workName,
          location: budget.location,
          date: dbToIso(budget.date),
          totalAmount: Number(budget.totalAmount),
          observations: budget.observations,
          items: budget.items.map((item) => ({
            description: item.description,
          })),
        }))}
      />
    </div>
  );
}
