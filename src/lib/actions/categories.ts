"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isoToDb, todayIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  id: z.number().int().positive(),
  dailyRate: z.number().positive(),
  retroWeekly: z.number().min(0),
});

export async function updateCategory(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de categoría inválidos");

  const { id, dailyRate, retroWeekly } = parsed.data;

  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return fail("Categoría no encontrada");

    const currentDaily = Number(existing.dailyRate);
    const currentRetro = Number(existing.retroWeekly);
    const pricesChanged =
      currentDaily !== dailyRate || currentRetro !== retroWeekly;

    await prisma.$transaction(async (tx) => {
      if (pricesChanged) {
        await tx.categoryRate.upsert({
          where: {
            categoryId_effectiveFrom: {
              categoryId: id,
              effectiveFrom: isoToDb(todayIso()),
            },
          },
          update: { dailyRate, retroWeekly },
          create: {
            categoryId: id,
            dailyRate,
            retroWeekly,
            effectiveFrom: isoToDb(todayIso()),
          },
        });
      }

      await tx.category.update({
        where: { id },
        data: { dailyRate, retroWeekly },
      });
    });

    revalidatePath("/", "layout");
    return ok(
      pricesChanged
        ? "Categoría actualizada. El nuevo precio aplica desde hoy."
        : "Categoría actualizada",
    );
  } catch {
    return fail("No se pudo actualizar la categoría");
  }
}
