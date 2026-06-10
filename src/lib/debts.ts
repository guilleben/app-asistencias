export type DebtMovementKind = "loan" | "payment" | "manual_discount";

export function getDebtMovementKind(
  amount: number,
  fromPayment: boolean,
): DebtMovementKind {
  if (amount > 0) return "loan";
  if (fromPayment) return "payment";
  return "manual_discount";
}

export const DEBT_MOVEMENT_LABELS: Record<DebtMovementKind, string> = {
  loan: "Préstamo",
  payment: "Pago de deuda",
  manual_discount: "Descuento manual",
};

type BalanceMovement = { id: number; amount: number; date: string };

export function computeBalanceAfterById(
  movements: BalanceMovement[],
): Map<number, number> {
  const chronological = [...movements].sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id,
  );

  let running = 0;
  const balanceById = new Map<number, number>();

  for (const movement of chronological) {
    running += movement.amount;
    balanceById.set(movement.id, running);
  }

  return balanceById;
}
