"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDebtMovement,
  deleteDebtMovement,
  settleEmployeeDebt,
  updateDebtMovement,
} from "@/lib/actions/debts";
import { formatIsoShort } from "@/lib/dates";
import {
  DEBT_MOVEMENT_LABELS,
  formatBalanceAfterLabel,
  formatEmployeeBalance,
  formatMovementAmount,
  getDebtMovementKind,
} from "@/lib/debts";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";

type Movement = {
  id: number;
  amount: number;
  note: string | null;
  date: string;
  fromPayment: boolean;
  paymentWeekStart: string | null;
  balanceAfter: number;
};

type EmployeeDebt = {
  id: number;
  name: string;
  balance: number;
  movements: Movement[];
};

type ManualMovementType = "loan" | "payment" | "credit";

function movementPayload(type: ManualMovementType, value: number) {
  return {
    amount: type === "loan" ? value : -value,
    allowCredit: type === "credit",
  };
}

function EmployeeBalanceBadge({ balance }: { balance: number }) {
  const formatted = formatEmployeeBalance(balance);

  if (formatted.tone === "debt") {
    return <Badge variant="destructive">{formatted.text}</Badge>;
  }
  if (formatted.tone === "credit") {
    return <Badge variant="success">{formatted.text}</Badge>;
  }
  return <Badge variant="success">{formatted.text}</Badge>;
}

function NewMovementDialog({ employees }: { employees: EmployeeDebt[] }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? 0);
  const [type, setType] = useState<ManualMovementType>("loan");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = employees.find((e) => e.id === employeeId);
  const debtPending = Math.max(selected?.balance ?? 0, 0);

  function handleSave() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    if (type === "payment" && debtPending === 0) {
      toast.error(
        "No hay deuda pendiente. Si ya descontaste en Pagos, no hace falta cargarlo acá.",
      );
      return;
    }
    if (type === "payment" && value > debtPending) {
      toast.error(
        `El monto supera la deuda pendiente (${formatARS(debtPending)}). Si ya descontaste en Pagos, no lo repitas acá.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await createDebtMovement({
        employeeId,
        ...movementPayload(type, value),
        note: note || undefined,
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setAmount("");
        setNote("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        Nuevo movimiento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo movimiento de deuda</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Empleado</Label>
            <NativeSelect
              value={employeeId}
              onChange={(e) => setEmployeeId(Number(e.target.value))}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <NativeSelect
              value={type}
              onChange={(e) => setType(e.target.value as ManualMovementType)}
            >
              <option value="loan">Nueva deuda (préstamo)</option>
              <option value="payment">Pago de deuda (manual)</option>
              <option value="credit">Saldo a favor al empleado</option>
            </NativeSelect>
            {type === "payment" ? (
              <p className="text-xs text-muted-foreground">
                {debtPending > 0
                  ? `Deuda pendiente: ${formatARS(debtPending)}. Si ya descontaste en Pagos, no lo cargues acá.`
                  : "Sin deuda pendiente. Si ya descontaste en Pagos, no hace falta otro movimiento."}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="debt-amount">Monto</Label>
            <Input
              id="debt-amount"
              type="number"
              inputMode="numeric"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="debt-note">Nota (opcional)</Label>
            <Input
              id="debt-note"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMovementDialog({
  movement,
  employeeBalance,
}: {
  movement: Movement;
  employeeBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ManualMovementType>(
    movement.amount > 0 ? "loan" : "payment",
  );
  const [amount, setAmount] = useState(String(Math.abs(movement.amount)));
  const [note, setNote] = useState(movement.note ?? "");
  const [pending, startTransition] = useTransition();

  const balanceBefore = employeeBalance - movement.amount;
  const debtPending = Math.max(balanceBefore, 0);

  function handleSave() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    if (type === "payment" && debtPending === 0) {
      toast.error(
        "No hay deuda pendiente. Si ya descontaste en Pagos, no hace falta cargarlo acá.",
      );
      return;
    }
    if (type === "payment" && value > debtPending) {
      toast.error(
        `El monto supera la deuda pendiente (${formatARS(debtPending)}).`,
      );
      return;
    }

    startTransition(async () => {
      const result = await updateDebtMovement({
        id: movement.id,
        ...movementPayload(type, value),
        note: note || undefined,
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Editar movimiento"
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar movimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <NativeSelect
              value={type}
              onChange={(e) => setType(e.target.value as ManualMovementType)}
            >
              <option value="loan">Deuda (préstamo)</option>
              <option value="payment">Pago de deuda (manual)</option>
              <option value="credit">Saldo a favor al empleado</option>
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit-amount-${movement.id}`}>Monto</Label>
            <Input
              id={`edit-amount-${movement.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`edit-note-${movement.id}`}>Nota (opcional)</Label>
            <Input
              id={`edit-note-${movement.id}`}
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettleDebtDialog({ employee }: { employee: EmployeeDebt }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (employee.balance === 0) return null;

  const formatted = formatEmployeeBalance(employee.balance);

  function handleConfirm() {
    startTransition(async () => {
      const result = await settleEmployeeDebt(employee.id);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Poner al día
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Poner al día — {employee.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Saldo actual:{" "}
          <span className="font-medium text-foreground">{formatted.text}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Se registrará un ajuste de {formatARS(Math.abs(employee.balance))} y
          el saldo quedará en cero.
        </p>
        {employee.balance > 0 ? (
          <p className="text-sm text-destructive">
            Si ya descontaste esta deuda en Pagos, no confirmes: el saldo ya
            debería estar en cero.
          </p>
        ) : null}
        <DialogFooter>
          <Button disabled={pending} onClick={handleConfirm}>
            {pending ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementRow({
  movement,
  employeeBalance,
  isLatestMovement,
}: {
  movement: Movement;
  employeeBalance: number;
  isLatestMovement: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const kind = getDebtMovementKind(
    movement.amount,
    movement.fromPayment,
    movement.note,
  );
  const balanceLabel = formatBalanceAfterLabel(
    movement.balanceAfter,
    employeeBalance,
    isLatestMovement,
  );
  const amountDisplay = formatMovementAmount(movement.amount, kind);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDebtMovement(movement.id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 py-2 text-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              kind === "loan"
                ? "destructive"
                : kind === "credit_applied" || kind === "settlement"
                  ? "success"
                  : "success"
            }
          >
            {DEBT_MOVEMENT_LABELS[kind]}
          </Badge>
          <p
            className={cn(
              "font-semibold",
              amountDisplay.tone === "debt"
                ? "text-destructive"
                : amountDisplay.tone === "credit"
                  ? "text-[#248a3d]"
                  : "text-foreground",
            )}
          >
            {amountDisplay.prefix}
            {amountDisplay.value}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(movement.date).toLocaleDateString("es-AR")}
          {movement.paymentWeekStart
            ? ` · Semana ${formatIsoShort(movement.paymentWeekStart)}`
            : ""}
          {movement.note ? ` · ${movement.note}` : ""}
        </p>
        {balanceLabel ? (
          <p
            className={cn(
              "text-xs font-semibold",
              movement.balanceAfter > 0 ? "text-destructive" : "text-[#248a3d]",
            )}
          >
            {balanceLabel}
          </p>
        ) : null}
      </div>
      {!movement.fromPayment && (
        <div className="flex shrink-0 items-center gap-1">
          <EditMovementDialog
            movement={movement}
            employeeBalance={employeeBalance}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={pending}
            onClick={handleDelete}
            aria-label="Eliminar movimiento"
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function DebtManager({ employees }: { employees: EmployeeDebt[] }) {
  const totalDebt = employees.reduce((acc, e) => acc + e.balance, 0);
  const totalLabel = formatEmployeeBalance(totalDebt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          Saldo neto:{" "}
          <span
            className={cn(
              "font-semibold",
              totalLabel.tone === "debt"
                ? "text-destructive"
                : totalLabel.tone === "credit"
                  ? "text-[#248a3d]"
                  : "text-foreground",
            )}
          >
            {totalLabel.text}
          </span>
        </p>
        <NewMovementDialog employees={employees} />
      </div>

      <div className="space-y-3">
        {employees.map((employee) => (
          <details
            key={employee.id}
            className="group rounded-xl bg-card ring-1 ring-foreground/10"
          >
            <summary className="flex cursor-pointer items-center justify-between p-4 text-sm [&::-webkit-details-marker]:hidden">
              <span className="font-medium">{employee.name}</span>
              <EmployeeBalanceBadge balance={employee.balance} />
            </summary>
            <div className="divide-y border-t px-4 pb-2">
              {employee.balance !== 0 ? (
                <div className="flex justify-end py-3">
                  <SettleDebtDialog employee={employee} />
                </div>
              ) : null}
              {employee.movements.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">
                  Sin movimientos.
                </p>
              ) : (
                employee.movements.map((movement, index) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    employeeBalance={employee.balance}
                    isLatestMovement={index === 0}
                  />
                ))
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
