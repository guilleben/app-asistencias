"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isoToDb } from "@/lib/dates";
import { prisma } from "@/lib/db";

const itemSchema = z.object({
  description: z.string().trim().min(1).max(500),
});

const budgetSchema = z.object({
  owner: z.string().trim().min(1).max(200),
  workName: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalAmount: z.number().positive(),
  observations: z.string().trim().max(2000).optional(),
  items: z.array(itemSchema).min(1),
});

export type BudgetInput = z.infer<typeof budgetSchema>;

function parseBudgetInput(
  input: BudgetInput,
):
  | { ok: false; message: string }
  | { ok: true; data: Omit<BudgetInput, "observations"> & { observations: string | null; items: { description: string }[] } } {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Datos del presupuesto inválidos" };

  const items = parsed.data.items.filter((item) => item.description.trim());
  if (items.length === 0) {
    return { ok: false, message: "Agregá al menos un ítem de detalle" };
  }

  return {
    ok: true,
    data: {
      ...parsed.data,
      observations: parsed.data.observations?.trim() || null,
      items,
    },
  };
}

export async function createBudget(input: BudgetInput): Promise<ActionResult> {
  const result = parseBudgetInput(input);
  if (!result.ok) return fail(result.message);

  const { owner, workName, location, date, totalAmount, observations, items } =
    result.data;

  try {
    await prisma.budget.create({
      data: {
        owner,
        workName,
        location,
        date: isoToDb(date),
        totalAmount,
        observations,
        items: {
          create: items.map((item, index) => ({
            description: item.description,
            sortOrder: index,
          })),
        },
      },
    });
    revalidatePath("/", "layout");
    return ok("Presupuesto creado");
  } catch {
    return fail("No se pudo crear el presupuesto");
  }
}

export async function updateBudget(
  id: number,
  input: BudgetInput,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Presupuesto inválido");

  const result = parseBudgetInput(input);
  if (!result.ok) return fail(result.message);

  const { owner, workName, location, date, totalAmount, observations, items } =
    result.data;

  try {
    const existing = await prisma.budget.findFirst({
      where: { id, active: true },
    });
    if (!existing) return fail("Presupuesto no encontrado");

    await prisma.$transaction([
      prisma.budget.update({
        where: { id },
        data: {
          owner,
          workName,
          location,
          date: isoToDb(date),
          totalAmount,
          observations,
        },
      }),
      prisma.budgetItem.deleteMany({ where: { budgetId: id } }),
      prisma.budgetItem.createMany({
        data: items.map((item, index) => ({
          budgetId: id,
          description: item.description,
          sortOrder: index,
        })),
      }),
    ]);
    revalidatePath("/", "layout");
    return ok("Presupuesto actualizado");
  } catch {
    return fail("No se pudo actualizar el presupuesto");
  }
}

export async function deleteBudget(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Presupuesto inválido");

  try {
    const existing = await prisma.budget.findFirst({
      where: { id, active: true },
    });
    if (!existing) return fail("Presupuesto no encontrado");

    await prisma.budget.update({
      where: { id },
      data: { active: false },
    });
    revalidatePath("/", "layout");
    return ok("Presupuesto eliminado");
  } catch {
    return fail("No se pudo eliminar el presupuesto");
  }
}
