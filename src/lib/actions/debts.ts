"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db";
import { getDebtBalance } from "@/lib/payroll";

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
    if (amount < 0) {
      const balance = await getDebtBalance(employeeId);
      if (Math.abs(amount) > balance) {
        return fail("El descuento supera la deuda actual");
      }
    }

    await prisma.debtMovement.create({
      data: { employeeId, amount, note: note || null },
    });

    revalidatePath("/", "layout");
    return ok(amount > 0 ? "Deuda registrada" : "Descuento registrado");
  } catch {
    return fail("No se pudo registrar el movimiento");
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
