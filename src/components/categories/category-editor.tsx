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
import { formatARS } from "@/lib/format";

type CategoryItem = {
  id: number;
  name: string;
  dailyRate: number;
  retroWeekly: number;
  employeeCount: number;
};

export function CategoryEditor({ category }: { category: CategoryItem }) {
  const [open, setOpen] = useState(false);
  const [dailyRate, setDailyRate] = useState(String(category.dailyRate));
  const [retroWeekly, setRetroWeekly] = useState(String(category.retroWeekly));
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const daily = Number(dailyRate);
    const retro = Number(retroWeekly);
    if (!daily || daily <= 0 || retro < 0) {
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="icon-sm" />}>
          <Pencil />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {category.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`daily-${category.id}`}>Precio por día</Label>
              <Input
                id={`daily-${category.id}`}
                type="number"
                inputMode="numeric"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`retro-${category.id}`}>
                Retroactivo semanal
              </Label>
              <Input
                id={`retro-${category.id}`}
                type="number"
                inputMode="numeric"
                value={retroWeekly}
                onChange={(e) => setRetroWeekly(e.target.value)}
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
    </div>
  );
}
