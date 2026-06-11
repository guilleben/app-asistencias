import { formatARS } from "@/lib/format";

export type DebtMovementKind =
  | "loan"
  | "payment"
  | "credit_applied"
  | "manual_discount";

export function getDebtMovementKind(
  amount: number,
  fromPayment: boolean,
): DebtMovementKind {
  if (amount > 0 && fromPayment) return "credit_applied";
  if (amount > 0) return "loan";
  if (fromPayment) return "payment";
  return "manual_discount";
}

export const DEBT_MOVEMENT_LABELS: Record<DebtMovementKind, string> = {
  loan: "Préstamo",
  payment: "Pago de deuda",
  credit_applied: "Saldo a favor aplicado",
  manual_discount: "Descuento / saldo a favor",
};

export function formatEmployeeBalance(balance: number): {
  text: string;
  tone: "debt" | "credit" | "ok";
} {
  if (balance > 0) {
    return { text: formatARS(balance), tone: "debt" };
  }
  if (balance < 0) {
    return { text: `${formatARS(Math.abs(balance))} a favor`, tone: "credit" };
  }
  return { text: "Al día", tone: "ok" };
}

export function formatBalanceAfterLabel(balanceAfter: number): string | null {
  if (balanceAfter > 0) {
    return `Sigue debiendo ${formatARS(balanceAfter)}`;
  }
  if (balanceAfter < 0) {
    return `Saldo a favor ${formatARS(Math.abs(balanceAfter))}`;
  }
  return null;
}

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
