"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { createDebtMovement, deleteDebtMovement } from "@/lib/actions/debts";
import { formatIsoShort } from "@/lib/dates";
import {
  DEBT_MOVEMENT_LABELS,
  getDebtMovementKind,
} from "@/lib/debts";
import { formatARS } from "@/lib/format";

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

function NewMovementDialog({ employees }: { employees: EmployeeDebt[] }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? 0);
  const [type, setType] = useState<"debt" | "discount">("debt");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    startTransition(async () => {
      const result = await createDebtMovement({
        employeeId,
        amount: type === "debt" ? value : -value,
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
              onChange={(e) => setType(e.target.value as "debt" | "discount")}
            >
              <option value="debt">Nueva deuda (préstamo)</option>
              <option value="discount">Descuento manual</option>
            </NativeSelect>
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

function MovementRow({ movement }: { movement: Movement }) {
  const [pending, startTransition] = useTransition();
  const kind = getDebtMovementKind(movement.amount, movement.fromPayment);

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
          <Badge variant={kind === "loan" ? "destructive" : "success"}>
            {DEBT_MOVEMENT_LABELS[kind]}
          </Badge>
          <p
            className={
              movement.amount > 0
                ? "font-semibold text-destructive"
                : "font-semibold text-[#248a3d]"
            }
          >
            {movement.amount > 0 ? "+" : ""}
            {formatARS(movement.amount)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(movement.date).toLocaleDateString("es-AR")}
          {movement.paymentWeekStart
            ? ` · Semana ${formatIsoShort(movement.paymentWeekStart)}`
            : ""}
          {movement.note ? ` · ${movement.note}` : ""}
        </p>
        {movement.balanceAfter > 0 ? (
          <p className="text-xs font-semibold text-destructive">
            Sigue debiendo {formatARS(movement.balanceAfter)}
          </p>
        ) : null}
      </div>
      {!movement.fromPayment && (
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Eliminar movimiento"
        >
          <Trash2 className="text-destructive" />
        </Button>
      )}
    </div>
  );
}

export function DebtManager({ employees }: { employees: EmployeeDebt[] }) {
  const totalDebt = employees.reduce((acc, e) => acc + e.balance, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          Deuda total:{" "}
          <span className="font-semibold text-destructive">
            {formatARS(totalDebt)}
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
              {employee.balance > 0 ? (
                <Badge variant="destructive">{formatARS(employee.balance)}</Badge>
              ) : (
                <Badge variant="success">Sin deuda</Badge>
              )}
            </summary>
            <div className="divide-y border-t px-4 pb-2">
              {employee.movements.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">
                  Sin movimientos.
                </p>
              ) : (
                employee.movements.map((movement) => (
                  <MovementRow key={movement.id} movement={movement} />
                ))
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
