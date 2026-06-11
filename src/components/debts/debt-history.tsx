"use client";

import { useMemo, useState } from "react";

import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatIsoShort } from "@/lib/dates";
import {
  DEBT_MOVEMENT_LABELS,
  formatBalanceAfterLabel,
  getDebtMovementKind,
  type DebtMovementKind,
} from "@/lib/debts";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DebtHistoryItem = {
  id: number;
  employeeId: number;
  employeeName: string;
  amount: number;
  note: string | null;
  date: string;
  fromPayment: boolean;
  paymentWeekStart: string | null;
  balanceAfter: number;
};

const FILTER_TABS = [
  { value: "all", label: "Todos" },
  { value: "loan", label: "Deudas" },
  { value: "payment", label: "Pagos" },
] as const;

type FilterTab = (typeof FILTER_TABS)[number]["value"];

function kindBadgeVariant(kind: DebtMovementKind) {
  if (kind === "loan") return "destructive" as const;
  if (kind === "credit_applied") return "success" as const;
  if (kind === "payment" || kind === "manual_discount") return "success" as const;
  return "secondary" as const;
}

function HistoryRow({ item }: { item: DebtHistoryItem }) {
  const kind = getDebtMovementKind(item.amount, item.fromPayment);
  const dateLabel = new Date(item.date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
          kind === "loan"
            ? "bg-destructive/10 text-destructive"
            : "bg-success/10 text-[#248a3d]",
        )}
      >
        {kind === "loan" || kind === "credit_applied" ? "+" : "−"}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] font-medium leading-tight">{item.employeeName}</p>
          <Badge variant={kindBadgeVariant(kind)}>{DEBT_MOVEMENT_LABELS[kind]}</Badge>
        </div>
        <p
          className={cn(
            "text-[17px] font-semibold tabular-nums tracking-tight",
            kind === "loan" || kind === "credit_applied"
              ? "text-destructive"
              : "text-[#248a3d]",
          )}
        >
          {kind === "loan" || kind === "credit_applied" ? "+" : ""}
          {formatARS(Math.abs(item.amount))}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {dateLabel}
          {item.paymentWeekStart
            ? ` · Semana ${formatIsoShort(item.paymentWeekStart)}`
            : ""}
          {item.note ? ` · ${item.note}` : ""}
        </p>
        {formatBalanceAfterLabel(item.balanceAfter) ? (
          <p
            className={cn(
              "text-[13px] font-semibold",
              item.balanceAfter > 0 ? "text-destructive" : "text-[#248a3d]",
            )}
          >
            {formatBalanceAfterLabel(item.balanceAfter)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function DebtHistory({
  items,
  employees,
}: {
  items: DebtHistoryItem[];
  employees: { id: number; name: string }[];
}) {
  const [employeeId, setEmployeeId] = useState<number | "all">("all");
  const [filter, setFilter] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (employeeId !== "all" && item.employeeId !== employeeId) return false;
      if (filter === "all") return true;
      return getDebtMovementKind(item.amount, item.fromPayment) === filter;
    });
  }, [items, employeeId, filter]);

  const totals = useMemo(() => {
    let loans = 0;
    let payments = 0;
    for (const item of filtered) {
      const kind = getDebtMovementKind(item.amount, item.fromPayment);
      if (kind === "loan") loans += item.amount;
      else payments += Math.abs(item.amount);
    }
    return { loans, payments };
  }, [filtered]);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[17px] font-semibold tracking-tight">Historial</h2>
        <p className="text-[13px] text-muted-foreground">
          Préstamos y pagos de deuda, más recientes primero
        </p>
      </div>

      <NativeSelect
        value={employeeId}
        onChange={(event) => {
          const value = event.target.value;
          setEmployeeId(value === "all" ? "all" : Number(value));
        }}
      >
        <option value="all">Todos los empleados</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.name}
          </option>
        ))}
      </NativeSelect>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterTab)}>
        <TabsList className="w-full">
          {FILTER_TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {FILTER_TABS.map(({ value }) => (
          <TabsContent key={value} value={value} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <p className="label-caption font-semibold text-destructive">
                  Deudas cargadas
                </p>
                <p className="stat-value mt-1 !text-destructive">
                  {formatARS(totals.loans)}
                </p>
              </div>
              <div className="stat-card">
                <p className="label-caption font-semibold text-[#248a3d]">
                  Pagos / descuentos
                </p>
                <p className="stat-value mt-1 text-[#248a3d]">
                  {formatARS(totals.payments)}
                </p>
              </div>
            </div>

            <div className="surface overflow-hidden">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  No hay movimientos para este filtro.
                </p>
              ) : (
                <div className="divide-y divide-border/60">
                  {filtered.map((item) => (
                    <HistoryRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
