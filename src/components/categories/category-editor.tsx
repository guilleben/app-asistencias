"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { updateCategory } from "@/lib/actions/categories";
import { formatIsoLong } from "@/lib/dates";
import {
  formatARS,
  formatAmountInputFromDigits,
  formatAmountInputFromNumber,
  parseAmountInput,
} from "@/lib/format";

type RateHistoryItem = {
  effectiveFrom: string;
  dailyRate: number;
  retroWeekly: number;
};

type CategoryItem = {
  id: number;
  name: string;
  dailyRate: number;
  retroWeekly: number;
  employeeCount: number;
  recentRates: RateHistoryItem[];
};

export function CategoryEditor({ category }: { category: CategoryItem }) {
  const [open, setOpen] = useState(false);
  const [dailyRate, setDailyRate] = useState(
    formatAmountInputFromNumber(category.dailyRate),
  );
  const [retroWeekly, setRetroWeekly] = useState(
    formatAmountInputFromNumber(category.retroWeekly),
  );
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDailyRate(formatAmountInputFromNumber(category.dailyRate));
      setRetroWeekly(formatAmountInputFromNumber(category.retroWeekly));
    }
  }

  function handleSave() {
    const daily = parseAmountInput(dailyRate);
    const retro = parseAmountInput(retroWeekly);
    if (daily === null || daily <= 0 || retro === null || retro < 0) {
      toast.error("Montos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await updateCategory({
        id: category.id,
        dailyRate: daily,
        retroWeekly: retro,
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
    <div className="flex items-center justify-between surface p-4">
      <div>
        <p className="text-sm font-medium">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatARS(category.dailyRate)}/día · retro{" "}
          {formatARS(category.retroWeekly)}/sem · {category.employeeCount}{" "}
          empleados
        </p>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button variant="outline" size="icon-sm" />}>
          <Pencil />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {category.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              El nuevo precio aplica desde hoy; los días anteriores mantienen el
              valor vigente.
            </p>
            <div className="space-y-1">
              <Label htmlFor={`daily-${category.id}`}>Precio por día</Label>
              <Input
                id={`daily-${category.id}`}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={dailyRate}
                onChange={(e) =>
                  setDailyRate(formatAmountInputFromDigits(e.target.value))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`retro-${category.id}`}>
                Retroactivo semanal
              </Label>
              <Input
                id={`retro-${category.id}`}
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={retroWeekly}
                onChange={(e) =>
                  setRetroWeekly(formatAmountInputFromDigits(e.target.value))
                }
              />
            </div>
            {category.recentRates.length > 0 ? (
              <div className="space-y-1">
                <Label>Historial reciente</Label>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {category.recentRates.map((rate) => (
                    <li key={rate.effectiveFrom}>
                      {formatIsoLong(rate.effectiveFrom)}:{" "}
                      {formatARS(rate.dailyRate)}/día ·{" "}
                      {formatARS(rate.retroWeekly)}/sem
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={handleSave}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
