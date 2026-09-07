"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import {
  inheritSiteId,
  inheritSiteIdsForEmployees,
  type AttendanceShift,
} from "@/lib/attendance";
import { isoToDb } from "@/lib/dates";
import { prisma } from "@/lib/db";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const shiftSchema = z.enum(["MORNING", "AFTERNOON"]);

async function resolveSiteId(
  employeeId: number,
  date: string,
  shift: AttendanceShift,
  present: boolean,
  siteId: number | null | undefined,
): Promise<number | null> {
  if (!present) return siteId ?? null;
  if (siteId !== undefined && siteId !== null) return siteId;
  if (siteId === null) return null;
  return inheritSiteId(employeeId, date, shift);
}

const setAttendanceSchema = z.object({
  employeeId: z.number().int().positive(),
  date: isoDate,
  shift: shiftSchema,
  present: z.boolean(),
  siteId: z.number().int().positive().nullable().optional(),
});

export async function setAttendance(
  input: z.infer<typeof setAttendanceSchema>,
): Promise<ActionResult> {
  const parsed = setAttendanceSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de asistencia inválidos");

  const { employeeId, date, shift, present, siteId } = parsed.data;

  try {
    const resolvedSiteId = await resolveSiteId(
      employeeId,
      date,
      shift,
      present,
      siteId,
    );

    await prisma.attendance.upsert({
      where: {
        employeeId_date_shift: { employeeId, date: isoToDb(date), shift },
      },
      update: {
        present,
        ...(present && { siteId: resolvedSiteId }),
      },
      create: {
        employeeId,
        date: isoToDb(date),
        shift,
        present,
        siteId: resolvedSiteId,
      },
    });

    revalidatePath("/", "layout");
    return ok(present ? "Presente registrado" : "Ausencia registrada");
  } catch {
    return fail("No se pudo guardar la asistencia");
  }
}

const setSiteSchema = z.object({
  employeeId: z.number().int().positive(),
  date: isoDate,
  shift: shiftSchema,
  siteId: z.number().int().positive().nullable(),
});

export async function setAttendanceSite(
  input: z.infer<typeof setSiteSchema>,
): Promise<ActionResult> {
  const parsed = setSiteSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos");

  const { employeeId, date, shift, siteId } = parsed.data;

  try {
    await prisma.attendance.upsert({
      where: {
        employeeId_date_shift: { employeeId, date: isoToDb(date), shift },
      },
      update: { siteId },
      create: {
        employeeId,
        date: isoToDb(date),
        shift,
        present: true,
        siteId,
      },
    });

    revalidatePath("/", "layout");
    return ok("Obra asignada");
  } catch {
    return fail("No se pudo asignar la obra");
  }
}

const markDaySchema = z.object({
  date: isoDate,
  shift: shiftSchema.nullable(), // null = ambos turnos
  present: z.boolean(),
  siteId: z.number().int().positive().nullable().optional(),
});

export async function markAllPresent(
  input: z.infer<typeof markDaySchema>,
): Promise<ActionResult> {
  const parsed = markDaySchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos");

  const { date, shift, present, siteId } = parsed.data;
  const shifts = shift ? [shift] : (["MORNING", "AFTERNOON"] as const);

  try {
    const employees = await prisma.employee.findMany({
      where: { active: true },
      select: { id: true },
    });
    const employeeIds = employees.map((e) => e.id);
    const inherited =
      present && siteId === undefined
        ? await inheritSiteIdsForEmployees(employeeIds, date, shifts)
        : new Map<string, number | null>();

    await prisma.$transaction(
      employees.flatMap((employee) =>
        shifts.map((s) => {
          const resolvedSiteId = present
            ? (siteId ??
              inherited.get(`${employee.id}|${s}`) ??
              null)
            : (siteId ?? null);

          return prisma.attendance.upsert({
            where: {
              employeeId_date_shift: {
                employeeId: employee.id,
                date: isoToDb(date),
                shift: s,
              },
            },
            update: {
              present,
              ...(present && { siteId: resolvedSiteId }),
            },
            create: {
              employeeId: employee.id,
              date: isoToDb(date),
              shift: s,
              present,
              siteId: resolvedSiteId,
            },
          });
        }),
      ),
    );

    revalidatePath("/", "layout");
    return ok(
      present ? "Todos marcados presentes" : "Presentes quitados",
    );
  } catch {
    return fail("No se pudo actualizar la asistencia");
  }
}
