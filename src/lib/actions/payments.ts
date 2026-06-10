"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isoToDb } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getDebtBalance, getWeekPayroll } from "@/lib/payroll";

const confirmSchema = z.object({
  employeeId: z.number().int().positive(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  debtDeduction: z.number().min(0),
  notes: z.string().max(500).optional(),
});

export async function confirmPayment(
  input: z.infer<typeof confirmSchema>,
): Promise<ActionResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de pago inválidos");

  const { employeeId, weekStart, debtDeduction, notes } = parsed.data;

  try {
    const existing = await prisma.payment.findUnique({
      where: {
        employeeId_weekStart: { employeeId, weekStart: isoToDb(weekStart) },
      },
    });
    if (existing) return fail("Esta semana ya fue pagada para este empleado");

    const payroll = await getWeekPayroll(weekStart);
    const data = payroll.find((p) => p.employeeId === employeeId);
    if (!data) return fail("Empleado no encontrado");

    const debtBalance = await getDebtBalance(employeeId);
    if (debtDeduction > debtBalance) {
      return fail("La deducción supera la deuda actual");
    }

    const totalPaid = data.suggestedTotal - debtDeduction;
    if (totalPaid < 0) return fail("El total a pagar no puede ser negativo");

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          employeeId,
          weekStart: isoToDb(weekStart),
          baseAmount: data.baseAmount,
          retroAmount: data.retroAmount,
          aguinaldoAmount: data.aguinaldoAmount,
          debtDeduction,
          totalPaid,
          notes: notes || null,
        },
      });

      if (debtDeduction > 0) {
        await tx.debtMovement.create({
          data: {
            employeeId,
            amount: -debtDeduction,
            note: `Descuento en pago semanal (${weekStart})`,
            paymentId: payment.id,
          },
        });
      }
    });

    revalidatePath("/", "layout");
    return ok("Pago registrado correctamente");
  } catch {
    return fail("No se pudo registrar el pago");
  }
}

export async function cancelPayment(paymentId: number): Promise<ActionResult> {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return fail("Pago inválido");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.debtMovement.deleteMany({ where: { paymentId } });
      await tx.payment.delete({ where: { id: paymentId } });
    });

    revalidatePath("/", "layout");
    return ok("Pago anulado; la deuda fue restaurada");
  } catch {
    return fail("No se pudo anular el pago");
  }
}
