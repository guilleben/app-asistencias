"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db";

const upsertSchema = z.object({
  employeeId: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
  weeklyAmount: z.number().min(0).optional(),
  active: z.boolean(),
});

export async function upsertRetroactive(
  input: z.infer<typeof upsertSchema>,
): Promise<ActionResult> {
  const parsed = upsertSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de retroactivo inválidos");

  const { employeeId, month, year, frequency, weeklyAmount, active } =
    parsed.data;

  try {
    let amount = weeklyAmount;
    if (amount === undefined) {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: { category: true },
      });
      if (!employee) return fail("Empleado no encontrado");
      amount = Number(employee.category.retroWeekly);
    }

    await prisma.retroactive.upsert({
      where: { employeeId_month_year: { employeeId, month, year } },
      update: { frequency, weeklyAmount: amount, active },
      create: {
        employeeId,
        month,
        year,
        frequency,
        weeklyAmount: amount,
        active,
      },
    });

    revalidatePath("/", "layout");
    return ok(active ? "Retroactivo activado" : "Retroactivo desactivado");
  } catch {
    return fail("No se pudo guardar el retroactivo");
  }
}

const bulkSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
});

export async function activateRetroForAll(
  input: z.infer<typeof bulkSchema>,
): Promise<ActionResult> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos");

  const { month, year, frequency } = parsed.data;

  try {
    const employees = await prisma.employee.findMany({
      where: { active: true },
      include: { category: true },
    });

    await prisma.$transaction(
      employees.map((employee) =>
        prisma.retroactive.upsert({
          where: {
            employeeId_month_year: { employeeId: employee.id, month, year },
          },
          update: { active: true, frequency },
          create: {
            employeeId: employee.id,
            month,
            year,
            frequency,
            weeklyAmount: Number(employee.category.retroWeekly),
            active: true,
          },
        }),
      ),
    );

    revalidatePath("/", "layout");
    return ok("Retroactivo activado para todos los empleados");
  } catch {
    return fail("No se pudo activar el retroactivo masivo");
  }
}

export async function deleteRetroactive(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Retroactivo inválido");

  try {
    await prisma.retroactive.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok("Retroactivo eliminado");
  } catch {
    return fail("No se pudo eliminar el retroactivo");
  }
}
