"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  employeeId: z.number().int().positive(),
  amount: z.number().refine((v) => v !== 0, "El monto no puede ser cero"),
  note: z.string().max(300).optional(),
});

export async function createDebtMovement(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de deuda inválidos");

  const { employeeId, amount, note } = parsed.data;

  try {
    await prisma.debtMovement.create({
      data: { employeeId, amount, note: note || null },
    });

    revalidatePath("/", "layout");
    if (amount > 0) return ok("Deuda registrada");
    return ok("Movimiento registrado");
  } catch {
    return fail("No se pudo registrar el movimiento");
  }
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  amount: z.number().refine((v) => v !== 0, "El monto no puede ser cero"),
  note: z.string().max(300).optional(),
});

export async function updateDebtMovement(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos");

  const { id, amount, note } = parsed.data;

  try {
    const movement = await prisma.debtMovement.findUnique({ where: { id } });
    if (!movement) return fail("Movimiento no encontrado");
    if (movement.paymentId) {
      return fail("No se puede editar: pertenece a un pago. Anulá el pago.");
    }

    await prisma.debtMovement.update({
      where: { id },
      data: { amount, note: note ?? null },
    });

    revalidatePath("/", "layout");
    return ok("Movimiento actualizado");
  } catch {
    return fail("No se pudo actualizar el movimiento");
  }
}

export async function deleteDebtMovement(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Movimiento inválido");

  try {
    const movement = await prisma.debtMovement.findUnique({ where: { id } });
    if (!movement) return fail("Movimiento no encontrado");
    if (movement.paymentId) {
      return fail("No se puede eliminar: pertenece a un pago. Anulá el pago.");
    }

    await prisma.debtMovement.delete({ where: { id } });

    revalidatePath("/", "layout");
    return ok("Movimiento eliminado");
  } catch {
    return fail("No se pudo eliminar el movimiento");
  }
}
