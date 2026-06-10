import { CategoryEditor } from "@/components/categories/category-editor";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { dailyRate: "asc" },
    include: { _count: { select: { employees: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Precios por día (UOCRA) y retroactivo semanal"
      />
      <div className="space-y-3">
        {categories.map((category) => (
          <CategoryEditor
            key={category.id}
            category={{
              id: category.id,
              name: category.name,
              dailyRate: Number(category.dailyRate),
              retroWeekly: Number(category.retroWeekly),
              employeeCount: category._count.employees,
            }}
          />
        ))}
      </div>
    </div>
  );
}
