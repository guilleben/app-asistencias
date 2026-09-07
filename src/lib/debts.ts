import { formatARS } from "@/lib/format";

export const SETTLE_DEBT_NOTE = "Puesto al día";

export type DebtMovementKind =
  | "loan"
  | "payment"
  | "credit_applied"
  | "manual_discount"
  | "settlement";

export function getDebtMovementKind(
  amount: number,
  fromPayment: boolean,
  note?: string | null,
): DebtMovementKind {
  if (note === SETTLE_DEBT_NOTE) return "settlement";
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
  settlement: "Puesto al día",
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

/** Manual debt payment (not credit grant). Fails if it would overpay or double-count Pagos. */
export function validateManualDebtReduction(
  balanceBefore: number,
  amount: number,
  allowCredit: boolean,
): string | null {
  if (amount >= 0 || allowCredit) return null;

  const debtPending = Math.max(balanceBefore, 0);
  if (debtPending === 0) {
    return "No hay deuda pendiente. Si ya descontaste en Pagos, no hace falta cargarlo acá.";
  }
  if (balanceBefore + amount < 0) {
    return `El monto supera la deuda pendiente (${formatARS(debtPending)}). Si ya descontaste en Pagos, no lo repitas acá.`;
  }
  return null;
}

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

// ponytail: self-check
if (process.env.NODE_ENV !== "production") {
  const cases: Array<[number, number, boolean, boolean]> = [
    [100_000, -50_000, false, true],
    [100_000, -100_000, false, true],
    [100_000, -150_000, false, false],
    [0, -10_000, false, false],
    [0, -10_000, true, true],
    [100_000, 50_000, false, true],
  ];
  for (const [before, amount, allowCredit, shouldPass] of cases) {
    const err = validateManualDebtReduction(before, amount, allowCredit);
    if ((err === null) !== shouldPass) {
      throw new Error("validateManualDebtReduction self-check failed");
    }
  }
}
