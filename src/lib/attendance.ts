import { dbToIso, isoToDb, weekDaysIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

export type AttendanceShift = "MORNING" | "AFTERNOON";

function cellKey(employeeId: number, date: string, shift: AttendanceShift): string {
  return `${employeeId}|${date}|${shift}`;
}

function shiftKey(employeeId: number, shift: AttendanceShift): string {
  return `${employeeId}|${shift}`;
}

async function activeSiteIds(): Promise<Set<number>> {
  const sites = await prisma.site.findMany({
    where: { active: true },
    select: { id: true },
  });
  return new Set(sites.map((s) => s.id));
}

/** Last obra assigned for this employee+shift strictly before dateIso. */
export async function inheritSiteId(
  employeeId: number,
  dateIso: string,
  shift: AttendanceShift,
): Promise<number | null> {
  const active = await activeSiteIds();
  const previous = await prisma.attendance.findFirst({
    where: {
      employeeId,
      shift,
      siteId: { not: null },
      date: { lt: isoToDb(dateIso) },
    },
    orderBy: { date: "desc" },
    select: { siteId: true },
  });
  const siteId = previous?.siteId ?? null;
  return siteId && active.has(siteId) ? siteId : null;
}

/** Batch inherit for mark-all; key = `${employeeId}|${shift}`. */
export async function inheritSiteIdsForEmployees(
  employeeIds: number[],
  dateIso: string,
  shifts: readonly AttendanceShift[],
): Promise<Map<string, number | null>> {
  if (employeeIds.length === 0) return new Map();

  const active = await activeSiteIds();
  const rows = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      shift: { in: [...shifts] },
      siteId: { not: null },
      date: { lt: isoToDb(dateIso) },
    },
    orderBy: { date: "desc" },
    select: { employeeId: true, shift: true, siteId: true },
  });

  const map = new Map<string, number | null>();
  for (const row of rows) {
    const key = shiftKey(row.employeeId, row.shift);
    if (!map.has(key) && row.siteId && active.has(row.siteId)) {
      map.set(key, row.siteId);
    }
  }
  return map;
}

type WeekAttendance = {
  employeeId: number;
  date: Date;
  shift: AttendanceShift;
  siteId: number | null;
};

/** Display defaults per cell; carries obra forward day-to-day and across weeks. */
export async function getWeekSiteDefaults(
  employeeIds: number[],
  weekStart: string,
  weekAttendances: WeekAttendance[],
): Promise<Map<string, number | null>> {
  const days = weekDaysIso(weekStart);
  const active = await activeSiteIds();
  const shifts: AttendanceShift[] = ["MORNING", "AFTERNOON"];

  const prior = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      siteId: { not: null },
      date: { lt: isoToDb(weekStart) },
    },
    orderBy: [{ date: "asc" }],
    select: { employeeId: true, shift: true, siteId: true },
  });

  const last = new Map<string, number>();
  for (const row of prior) {
    if (row.siteId && active.has(row.siteId)) {
      last.set(shiftKey(row.employeeId, row.shift), row.siteId);
    }
  }

  const weekByKey = new Map(
    weekAttendances.map((a) => [
      cellKey(a.employeeId, dbToIso(a.date), a.shift),
      a,
    ]),
  );

  const defaults = new Map<string, number | null>();

  for (const day of days) {
    for (const employeeId of employeeIds) {
      for (const shift of shifts) {
        const key = cellKey(employeeId, day, shift);
        const record = weekByKey.get(key);

        if (record) {
          const siteId =
            record.siteId && active.has(record.siteId) ? record.siteId : null;
          defaults.set(key, siteId);
          if (siteId) last.set(shiftKey(employeeId, shift), siteId);
          else last.delete(shiftKey(employeeId, shift));
        } else {
          defaults.set(key, last.get(shiftKey(employeeId, shift)) ?? null);
        }
      }
    }
  }

  return defaults;
}
