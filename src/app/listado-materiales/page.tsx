import { ListadoMaterialesManager } from "@/components/listado-materiales/listado-materiales-manager";
import { PageHeader } from "@/components/page-header";
import { dbToIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ListadoMaterialesPage() {
  const lists = await prisma.materialList.findMany({
    where: { active: true },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Listado de materiales"
        description="Crear, editar y descargar listados en PDF"
      />
      <ListadoMaterialesManager
        listados={lists.map((list) => ({
          id: list.id,
          owner: list.owner,
          workName: list.workName,
          location: list.location,
          date: dbToIso(list.date),
          items: list.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
          })),
        }))}
      />
    </div>
  );
}
