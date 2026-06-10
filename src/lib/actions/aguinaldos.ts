"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isoToDb } from "@/lib/dates";
import { prisma } from "@/lib/db";

const baseSchema = z.object({
  employeeId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  semester: z.union([z.literal(1), z.literal(2)]),
  totalAmount: z.number().positive(),
  installments: z.union([z.literal(1), z.literal(2), z.literal(4)]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createAguinaldo(
  input: z.infer<typeof baseSchema>,
): Promise<ActionResult> {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de aguinaldo inválidos");

  const { employeeId, year, semester, totalAmount, installments, startDate } =
    parsed.data;

  try {
    const existing = await prisma.aguinaldo.findUnique({
      where: { employeeId_year_semester: { employeeId, year, semester } },
    });
    if (existing) {
      return fail("Ya existe un aguinaldo para este empleado y semestre");
    }

    await prisma.aguinaldo.create({
      data: {
        employeeId,
        year,
        semester,
        totalAmount,
        installments,
        startDate: isoToDb(startDate),
      },
    });

    revalidatePath("/", "layout");
    return ok("Aguinaldo creado");
  } catch {
    return fail("No se pudo crear el aguinaldo");
  }
}

const updateSchema = baseSchema.omit({ employeeId: true }).extend({
  id: z.number().int().positive(),
});

export async function updateAguinaldo(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de aguinaldo inválidos");

  const { id, year, semester, totalAmount, installments, startDate } =
    parsed.data;

  try {
    await prisma.aguinaldo.update({
      where: { id },
      data: {
        year,
        semester,
        totalAmount,
        installments,
        startDate: isoToDb(startDate),
      },
    });

    revalidatePath("/", "layout");
    return ok("Aguinaldo actualizado");
  } catch {
    return fail("No se pudo actualizar el aguinaldo");
  }
}

export async function toggleAguinaldo(
  id: number,
  active: boolean,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Aguinaldo inválido");

  try {
    await prisma.aguinaldo.update({ where: { id }, data: { active } });
    revalidatePath("/", "layout");
    return ok(active ? "Aguinaldo activado" : "Aguinaldo desactivado");
  } catch {
    return fail("No se pudo actualizar el aguinaldo");
  }
}

export async function deleteAguinaldo(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Aguinaldo inválido");

  try {
    await prisma.aguinaldo.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok("Aguinaldo eliminado");
  } catch {
    return fail("No se pudo eliminar el aguinaldo");
  }
}
