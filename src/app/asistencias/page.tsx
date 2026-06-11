import { AttendanceGrid } from "@/components/attendance/attendance-grid";
import { PageHeader } from "@/components/page-header";
import { WeekNav } from "@/components/week-nav";
import {
  addDaysIso,
  dbToIso,
  isoToDb,
  todayIso,
  weekStartIso,
} from "@/lib/dates";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AsistenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = weekStartIso(
    week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : todayIso(),
  );
  const weekEnd = addDaysIso(weekStart, 4);

  const [employees, sites, attendances] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.site.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.attendance.findMany({
      where: { date: { gte: isoToDb(weekStart), lte: isoToDb(weekEnd) } },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Asistencias" description="Tocá para marcar presente/ausente">
        <WeekNav weekStart={weekStart} basePath="/asistencias" />
      </PageHeader>

      <AttendanceGrid
        key={weekStart}
        weekStart={weekStart}
        employees={employees.map((e) => ({
          id: e.id,
          name: `${e.lastName}, ${e.firstName}`,
          category: e.category.name,
        }))}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
        records={attendances.map((a) => ({
          employeeId: a.employeeId,
          date: dbToIso(a.date),
          shift: a.shift,
          present: a.present,
          siteId: a.siteId,
          recordedAt: a.present ? a.updatedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
