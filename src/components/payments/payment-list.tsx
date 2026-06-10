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
import { formatARS } from "@/lib/format";
import type { EmployeePayroll } from "@/lib/payroll";

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
  const safeDeduction = Math.min(
    Math.max(deduction, 0),
    data.debtBalance,
    data.suggestedTotal,
  );
  const total = data.suggestedTotal - safeDeduction;

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
              <span className="text-muted-foreground">Deuda actual</span>
              <span
                className={
                  data.debtBalance > 0 ? "font-medium text-destructive" : ""
                }
              >
                {formatARS(data.debtBalance)}
              </span>
            </div>

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
                    max={Math.min(data.debtBalance, data.suggestedTotal)}
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
                        Math.min(data.debtBalance, data.suggestedTotal),
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
