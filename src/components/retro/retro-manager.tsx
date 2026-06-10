"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  activateRetroForAll,
  upsertRetroactive,
} from "@/lib/actions/retroactives";
import { formatARS } from "@/lib/format";

type Frequency = "WEEKLY" | "MONTHLY";

type EmployeeRetro = {
  id: number;
  name: string;
  categoryRetroWeekly: number;
  retro: {
    id: number;
    active: boolean;
    frequency: Frequency;
    weeklyAmount: number;
  } | null;
};

function RetroRow({
  employee,
  month,
  year,
}: {
  employee: EmployeeRetro;
  month: number;
  year: number;
}) {
  const [active, setActive] = useState(employee.retro?.active ?? false);
  const [frequency, setFrequency] = useState<Frequency>(
    employee.retro?.frequency ?? "WEEKLY",
  );
  const [amount, setAmount] = useState(
    String(employee.retro?.weeklyAmount ?? employee.categoryRetroWeekly),
  );
  const [pending, startTransition] = useTransition();

  function save(next: {
    active?: boolean;
    frequency?: Frequency;
    amount?: number;
  }) {
    const payload = {
      employeeId: employee.id,
      month,
      year,
      frequency: next.frequency ?? frequency,
      weeklyAmount: next.amount ?? Number(amount) ?? undefined,
      active: next.active ?? active,
    };

    startTransition(async () => {
      const result = await upsertRetroactive(payload);
      if (result.ok) {
        toast.success(`${result.message} — ${employee.name}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <Switch
        checked={active}
        disabled={pending}
        onCheckedChange={(checked) => {
          setActive(checked);
          save({ active: checked });
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{employee.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatARS(employee.categoryRetroWeekly)}/sem según categoría
        </p>
      </div>
      {active && (
        <div className="flex items-center gap-2">
          <NativeSelect
            className="w-28"
            value={frequency}
            disabled={pending}
            onChange={(e) => {
              const value = e.target.value as Frequency;
              setFrequency(value);
              save({ frequency: value });
            }}
          >
            <option value="WEEKLY">Semanal</option>
            <option value="MONTHLY">Mensual</option>
          </NativeSelect>
          <Input
            className="w-28"
            type="number"
            inputMode="numeric"
            value={amount}
            disabled={pending}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => {
              const value = Number(amount);
              if (value >= 0) save({ amount: value });
            }}
          />
        </div>
      )}
    </div>
  );
}

export function RetroManager({
  month,
  year,
  employees,
}: {
  month: number;
  year: number;
  employees: EmployeeRetro[];
}) {
  const [pending, startTransition] = useTransition();

  function handleBulk() {
    startTransition(async () => {
      const result = await activateRetroForAll({
        month,
        year,
        frequency: "WEEKLY",
      });
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={handleBulk}
        >
          Activar todos (semanal)
        </Button>
      </div>
      <div className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
        {employees.map((employee) => (
          <RetroRow
            key={`${employee.id}-${month}-${year}-${employee.retro?.id ?? "new"}`}
            employee={employee}
            month={month}
            year={year}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Semanal: se suma a cada pago de la semana del mes. Mensual: se paga
        completo (monto × semanas del mes) en la última semana del mes.
      </p>
    </div>
  );
}
