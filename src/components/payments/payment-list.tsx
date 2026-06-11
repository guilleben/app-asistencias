"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cancelPayment, confirmPayment } from "@/lib/actions/payments";
import { formatEmployeeBalance } from "@/lib/debts";
import { formatARS } from "@/lib/format";
import type { EmployeePayroll } from "@/lib/payroll";

function formatPaymentDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={strong ? "text-base font-semibold" : ""}>{value}</span>
    </div>
  );
}

function PaymentCard({
  weekStart,
  data,
}: {
  weekStart: string;
  data: EmployeePayroll;
}) {
  const [deduction, setDeduction] = useState(0);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const paid = data.payment;
  const creditAvailable = data.debtBalance < 0 ? -data.debtBalance : 0;
  const maxDeduction = Math.max(data.debtBalance, 0);
  const safeDeduction = Math.min(
    Math.max(deduction, 0),
    maxDeduction,
    data.suggestedTotal,
  );
  const total = data.suggestedTotal - safeDeduction + creditAvailable;

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmPayment({
        employeeId: data.employeeId,
        weekStart,
        debtDeduction: safeDeduction,
        notes: notes || undefined,
      });
      if (result.ok) {
        toast.success(`${result.message} — ${data.fullName}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleCancel() {
    if (!paid) return;
    startTransition(async () => {
      const result = await cancelPayment(paid.id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{data.fullName}</span>
          {paid ? (
            <Badge className="bg-success/15 text-[#248a3d] hover:bg-success/15">
              Pagado
            </Badge>
          ) : (
            <Badge variant="outline">{data.categoryName}</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-1.5 text-sm">
        {paid ? (
          <>
            <p className="text-[11px] text-muted-foreground">
              Pagado el {formatPaymentDate(paid.paidAt)}
            </p>
            <Row label={`Base`} value={formatARS(paid.baseAmount)} />
            {paid.retroAmount > 0 && (
              <Row label="Retroactivo" value={formatARS(paid.retroAmount)} />
            )}
            {paid.aguinaldoAmount > 0 && (
              <Row label="Aguinaldo" value={formatARS(paid.aguinaldoAmount)} />
            )}
            {paid.debtDeduction > 0 && (
              <Row
                label="Descuento deuda"
                value={`- ${formatARS(paid.debtDeduction)}`}
              />
            )}
            <Row label="Total pagado" value={formatARS(paid.totalPaid)} strong />
            {paid.notes && (
              <p className="pt-1 text-xs text-muted-foreground">{paid.notes}</p>
            )}
          </>
        ) : (
          <>
            <Row
              label={`Base (${data.shiftsPresent} turnos)`}
              value={formatARS(data.baseAmount)}
            />
            {data.retroAmount > 0 && (
              <Row label="Retroactivo" value={formatARS(data.retroAmount)} />
            )}
            {data.aguinaldoAmount > 0 && (
              <Row label="Aguinaldo" value={formatARS(data.aguinaldoAmount)} />
            )}
            <Row label="Subtotal" value={formatARS(data.suggestedTotal)} />

            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Saldo de deuda</span>
              <span
                className={
                  data.debtBalance > 0
                    ? "font-medium text-destructive"
                    : data.debtBalance < 0
                      ? "font-medium text-[#248a3d]"
                      : ""
                }
              >
                {formatEmployeeBalance(data.debtBalance).text}
              </span>
            </div>

            {creditAvailable > 0 && (
              <Row
                label="Saldo a favor aplicado"
                value={`+ ${formatARS(creditAvailable)}`}
              />
            )}

            {data.debtBalance > 0 && (
              <div className="space-y-1 pt-2">
                <Label htmlFor={`deduction-${data.employeeId}`}>
                  Descontar de la deuda
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`deduction-${data.employeeId}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={Math.min(maxDeduction, data.suggestedTotal)}
                    value={deduction === 0 ? "" : deduction}
                    placeholder="0"
                    onChange={(e) => setDeduction(Number(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDeduction(
                        Math.min(maxDeduction, data.suggestedTotal),
                      )
                    }
                  >
                    Toda
                  </Button>
                </div>
                {safeDeduction > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Deuda restante:{" "}
                    {formatARS(data.debtBalance - safeDeduction)}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1 pt-2">
              <Label htmlFor={`notes-${data.employeeId}`}>Nota (opcional)</Label>
              <Input
                id={`notes-${data.employeeId}`}
                value={notes}
                maxLength={500}
                placeholder="Ej: acuerdo de la semana"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Row label="Total a pagar" value={formatARS(total)} strong />
          </>
        )}
      </CardContent>

      <CardFooter className="justify-end gap-2">
        {paid ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={handleCancel}
          >
            Anular pago
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={pending || data.suggestedTotal === 0}
            onClick={handleConfirm}
          >
            {pending ? "Guardando..." : `Pagar ${formatARS(total)}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function PaymentList({
  weekStart,
  payroll,
}: {
  weekStart: string;
  payroll: EmployeePayroll[];
}) {
  if (payroll.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay empleados activos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {payroll.map((data) => (
        <PaymentCard key={data.employeeId} weekStart={weekStart} data={data} />
      ))}
    </div>
  );
}
