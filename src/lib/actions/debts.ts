"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { SETTLE_DEBT_NOTE, validateManualDebtReduction } from "@/lib/debts";
import { prisma } from "@/lib/db";
import { getDebtBalance } from "@/lib/payroll";

const createSchema = z.object({
  employeeId: z.number().int().positive(),
  amount: z.number().refine((v) => v !== 0, "El monto no puede ser cero"),
  note: z.string().max(300).optional(),
  allowCredit: z.boolean().optional(),
});

async function balanceExcludingMovement(
  employeeId: number,
  excludeId: number,
): Promise<number> {
  const result = await prisma.debtMovement.aggregate({
    where: { employeeId, NOT: { id: excludeId } },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

export async function createDebtMovement(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de deuda inválidos");

  const { employeeId, amount, note, allowCredit = false } = parsed.data;

  const balance = await getDebtBalance(employeeId);
  const validationError = validateManualDebtReduction(
    balance,
    amount,
    allowCredit,
  );
  if (validationError) return fail(validationError);

  try {
    await prisma.debtMovement.create({
      data: { employeeId, amount, note: note || null },
    });

    revalidatePath("/", "layout");
    if (amount > 0) return ok("Deuda registrada");
    if (allowCredit) return ok("Saldo a favor registrado");
    return ok("Pago de deuda registrado");
  } catch {
    return fail("No se pudo registrar el movimiento");
  }
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  amount: z.number().refine((v) => v !== 0, "El monto no puede ser cero"),
  note: z.string().max(300).optional(),
  allowCredit: z.boolean().optional(),
});

export async function updateDebtMovement(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos");

  const { id, amount, note, allowCredit = false } = parsed.data;

  try {
    const movement = await prisma.debtMovement.findUnique({ where: { id } });
    if (!movement) return fail("Movimiento no encontrado");
    if (movement.paymentId) {
      return fail("No se puede editar: pertenece a un pago. Anulá el pago.");
    }

    const balance = await balanceExcludingMovement(movement.employeeId, id);
    const validationError = validateManualDebtReduction(
      balance,
      amount,
      allowCredit,
    );
    if (validationError) return fail(validationError);

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

export async function settleEmployeeDebt(
  employeeId: number,
): Promise<ActionResult> {
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return fail("Empleado inválido");
  }

  const balance = await getDebtBalance(employeeId);
  if (balance === 0) return fail("Ya está al día");

  try {
    await prisma.debtMovement.create({
      data: {
        employeeId,
        amount: -balance,
        note: SETTLE_DEBT_NOTE,
      },
    });

    revalidatePath("/", "layout");
    return ok("Saldo puesto al día");
  } catch {
    return fail("No se pudo ajustar el saldo");
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
