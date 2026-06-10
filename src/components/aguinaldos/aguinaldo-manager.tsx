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
import { Switch } from "@/components/ui/switch";
import {
  createAguinaldo,
  deleteAguinaldo,
  toggleAguinaldo,
  updateAguinaldo,
} from "@/lib/actions/aguinaldos";
import { formatIsoLong, weekStartIso } from "@/lib/dates";
import { formatARS } from "@/lib/format";

type AguinaldoData = {
  id: number;
  totalAmount: number;
  installments: number;
  startDate: string;
  active: boolean;
};

type EmployeeRow = {
  id: number;
  name: string;
  aguinaldo: AguinaldoData | null;
};

function AguinaldoForm({
  title,
  initial,
  defaultStart,
  pending,
  onSave,
}: {
  title: string;
  initial?: AguinaldoData;
  defaultStart: string;
  pending: boolean;
  onSave: (data: {
    totalAmount: number;
    installments: 1 | 2 | 4;
    startDate: string;
  }) => void;
}) {
  const [amount, setAmount] = useState(
    initial ? String(initial.totalAmount) : "",
  );
  const [installments, setInstallments] = useState(
    String(initial?.installments ?? 2),
  );
  const [startDate, setStartDate] = useState(
    initial?.startDate ?? defaultStart,
  );

  function handleSave() {
    const total = Number(amount);
    if (!total || total <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    const cuotas = Number(installments);
    if (![1, 2, 4].includes(cuotas)) {
      toast.error("Cuotas inválidas");
      return;
    }
    onSave({
      totalAmount: total,
      installments: cuotas as 1 | 2 | 4,
      startDate: weekStartIso(startDate),
    });
  }

  const perInstallment = Number(amount) / Number(installments) || 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ag-amount">Monto total</Label>
          <Input
            id="ag-amount"
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Forma de pago</Label>
          <NativeSelect
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
          >
            <option value="1">1 pago (una semana)</option>
            <option value="2">2 cuotas (dos semanas)</option>
            <option value="4">4 cuotas (cuatro semanas)</option>
          </NativeSelect>
          {perInstallment > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatARS(perInstallment)} por semana
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="ag-start">Semana de inicio</Label>
          <Input
            id="ag-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Se ajusta automáticamente al lunes de esa semana.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={pending} onClick={handleSave}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function EmployeeAguinaldoRow({
  employee,
  year,
  semester,
  defaultStart,
}: {
  employee: EmployeeRow;
  year: number;
  semester: 1 | 2;
  defaultStart: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ag = employee.aguinaldo;

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(`${result.message} — ${employee.name}`);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{employee.name}</p>
        {ag ? (
          <p className="text-xs text-muted-foreground">
            {formatARS(ag.totalAmount)} en {ag.installments}{" "}
            {ag.installments === 1 ? "pago" : "cuotas"} · desde{" "}
            {formatIsoLong(ag.startDate)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Sin aguinaldo cargado</p>
        )}
      </div>

      {ag ? (
        <div className="flex items-center gap-1.5">
          {!ag.active && <Badge variant="outline">Pausado</Badge>}
          <Switch
            checked={ag.active}
            disabled={pending}
            onCheckedChange={(checked) =>
              run(() => toggleAguinaldo(ag.id, checked))
            }
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <Pencil />
            </DialogTrigger>
            <DialogContent>
              <AguinaldoForm
                title={`Editar aguinaldo — ${employee.name}`}
                initial={ag}
                defaultStart={defaultStart}
                pending={pending}
                onSave={(data) =>
                  run(() =>
                    updateAguinaldo({ id: ag.id, year, semester, ...data }),
                  )
                }
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => run(() => deleteAguinaldo(ag.id))}
            aria-label="Eliminar"
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus data-icon="inline-start" />
            Crear
          </DialogTrigger>
          <DialogContent>
            <AguinaldoForm
              title={`Aguinaldo — ${employee.name}`}
              defaultStart={defaultStart}
              pending={pending}
              onSave={(data) =>
                run(() =>
                  createAguinaldo({
                    employeeId: employee.id,
                    year,
                    semester,
                    ...data,
                  }),
                )
              }
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function AguinaldoManager({
  year,
  semester,
  defaultStart,
  employees,
}: {
  year: number;
  semester: 1 | 2;
  defaultStart: string;
  employees: EmployeeRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
        {employees.map((employee) => (
          <EmployeeAguinaldoRow
            key={`${employee.id}-${employee.aguinaldo?.id ?? "new"}`}
            employee={employee}
            year={year}
            semester={semester}
            defaultStart={defaultStart}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Cada cuota se suma automáticamente al pago semanal correspondiente a
        partir de la semana de inicio.
      </p>
    </div>
  );
}
