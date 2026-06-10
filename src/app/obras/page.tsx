import { PageHeader } from "@/components/page-header";
import { SiteManager } from "@/components/sites/site-manager";
import {
  addDaysIso,
  formatIsoShort,
  isoToDb,
  todayIso,
  weekStartIso,
} from "@/lib/dates";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ObrasPage() {
  const weekStart = weekStartIso(todayIso());
  const weekEnd = addDaysIso(weekStart, 4);

  const [sites, weekAttendances] = await Promise.all([
    prisma.site.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.attendance.findMany({
      where: {
        present: true,
        siteId: { not: null },
        date: { gte: isoToDb(weekStart), lte: isoToDb(weekEnd) },
      },
      include: { employee: true },
    }),
  ]);

  const weekBySite = new Map<
    number,
    Map<number, { name: string; shifts: number }>
  >();
  for (const att of weekAttendances) {
    if (!att.siteId) continue;
    const employees = weekBySite.get(att.siteId) ?? new Map();
    const entry = employees.get(att.employeeId) ?? {
      name: `${att.employee.lastName}, ${att.employee.firstName}`,
      shifts: 0,
    };
    entry.shifts += 1;
    employees.set(att.employeeId, entry);
    weekBySite.set(att.siteId, employees);
  }

  return (
    <div>
      <PageHeader
        title="Obras"
        description={`Semana ${formatIsoShort(weekStart)} – ${formatIsoShort(addDaysIso(weekStart, 4))}`}
      />
      <SiteManager
        sites={sites.map((site) => ({
          id: site.id,
          name: site.name,
          active: site.active,
          weekEmployees: Array.from(
            weekBySite.get(site.id)?.values() ?? [],
          ).sort((a, b) => a.name.localeCompare(b.name)),
        }))}
      />
    </div>
  );
}
