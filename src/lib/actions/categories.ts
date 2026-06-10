"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
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
    await prisma.category.update({
      where: { id },
      data: { dailyRate, retroWeekly },
    });

    revalidatePath("/", "layout");
    return ok("Categoría actualizada");
  } catch {
    return fail("No se pudo actualizar la categoría");
  }
}
