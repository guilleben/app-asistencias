"use client";

import { Download, Minus, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  createBudget,
  deleteBudget,
  updateBudget,
  type BudgetInput,
} from "@/lib/actions/presupuestos";
import { formatIsoLong, todayIso } from "@/lib/dates";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/utils";

type BudgetItem = {
  description: string;
};

export type PresupuestoItem = {
  id: number;
  owner: string;
  workName: string;
  location: string;
  date: string;
  totalAmount: number;
  observations: string | null;
  items: BudgetItem[];
};

type FormState = {
  owner: string;
  workName: string;
  location: string;
  date: string;
  totalAmount: string;
  observations: string;
  items: BudgetItem[];
};

function emptyForm(): FormState {
  return {
    owner: "",
    workName: "",
    location: "",
    date: todayIso(),
    totalAmount: "",
    observations: "",
    items: [{ description: "" }],
  };
}

function formFromPresupuesto(presupuesto: PresupuestoItem): FormState {
  return {
    owner: presupuesto.owner,
    workName: presupuesto.workName,
    location: presupuesto.location,
    date: presupuesto.date,
    totalAmount: String(presupuesto.totalAmount),
    observations: presupuesto.observations ?? "",
    items:
      presupuesto.items.length > 0
        ? presupuesto.items.map((item) => ({ description: item.description }))
        : [{ description: "" }],
  };
}

function formToInput(form: FormState): BudgetInput | null {
  const totalAmount = Number(form.totalAmount);
  const items = form.items
    .map((item) => ({ description: item.description.trim() }))
    .filter((item) => item.description);

  if (!form.owner.trim()) return null;
  if (!form.workName.trim()) return null;
  if (!form.location.trim()) return null;
  if (!form.date) return null;
  if (!totalAmount || totalAmount <= 0) return null;
  if (items.length === 0) return null;

  return {
    owner: form.owner.trim(),
    workName: form.workName.trim(),
    location: form.location.trim(),
    date: form.date,
    totalAmount,
    observations: form.observations.trim() || undefined,
    items,
  };
}

function BudgetFormFields({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  function updateItem(index: number, description: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { description } : item,
      ),
    }));
  }

  function addItem(afterIndex?: number) {
    setForm((prev) => {
      const items = [...prev.items];
      const index = afterIndex ?? items.length - 1;
      items.splice(index + 1, 0, { description: "" });
      return { ...prev, items };
    });
  }

  function removeItem(index: number) {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="budget-owner">Propietario</Label>
        <Input
          id="budget-owner"
          value={form.owner}
          maxLength={200}
          onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="budget-work">Obra</Label>
        <Input
          id="budget-work"
          value={form.workName}
          maxLength={200}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, workName: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="budget-location">Ubicación</Label>
        <Input
          id="budget-location"
          value={form.location}
          maxLength={200}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, location: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="budget-date">Fecha</Label>
        <Input
          id="budget-date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Detalle</Label>
        {form.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <Input
              value={item.description}
              maxLength={500}
              placeholder={`Ítem ${index + 1}`}
              onChange={(e) => updateItem(index, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Agregar ítem"
              onClick={() => addItem(index)}
            >
              <Plus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Quitar ítem"
              disabled={form.items.length <= 1}
              onClick={() => removeItem(index)}
            >
              <Minus />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor="budget-total">Monto total</Label>
        <Input
          id="budget-total"
          type="number"
          min={1}
          step={1}
          value={form.totalAmount}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, totalAmount: e.target.value }))
          }
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="budget-observations">Observaciones</Label>
        <textarea
          id="budget-observations"
          value={form.observations}
          maxLength={2000}
          rows={3}
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, observations: e.target.value }))
          }
        />
      </div>
    </div>
  );
}

function BudgetFormDialog({
  presupuesto,
  trigger,
}: {
  presupuesto?: PresupuestoItem;
  trigger: React.ReactElement;
}) {
  const isEdit = Boolean(presupuesto);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    presupuesto ? formFromPresupuesto(presupuesto) : emptyForm(),
  );
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setForm(presupuesto ? formFromPresupuesto(presupuesto) : emptyForm());
    }
  }

  function handleSave() {
    const input = formToInput(form);
    if (!input) {
      toast.error("Completá todos los campos obligatorios y al menos un ítem");
      return;
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateBudget(presupuesto!.id, input)
        : await createBudget(input);

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        if (!isEdit) setForm(emptyForm());
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar presupuesto" : "Nuevo presupuesto"}
          </DialogTitle>
        </DialogHeader>
        <BudgetFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PresupuestoCard({ presupuesto }: { presupuesto: PresupuestoItem }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("¿Eliminar este presupuesto?")) return;

    startTransition(async () => {
      const result = await deleteBudget(presupuesto.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{presupuesto.owner}</p>
          <p className="text-xs text-muted-foreground">
            {presupuesto.workName} · {presupuesto.location}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatIsoLong(presupuesto.date)}
          </p>
          <p className="text-sm font-semibold">
            {formatARS(presupuesto.totalAmount)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Descargar PDF"
            nativeButton={false}
            render={
              <a
                href={`/api/presupuestos/${presupuesto.id}/pdf`}
                download
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <Download />
          </Button>
          <BudgetFormDialog
            presupuesto={presupuesto}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Editar">
                <Pencil />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            aria-label="Eliminar"
            onClick={handleDelete}
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PresupuestoManager({
  presupuestos,
}: {
  presupuestos: PresupuestoItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <BudgetFormDialog
          trigger={
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Nuevo presupuesto
            </Button>
          }
        />
      </div>
      <div className="space-y-3">
        {presupuestos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay presupuestos creados.
          </p>
        ) : (
          presupuestos.map((presupuesto) => (
            <PresupuestoCard key={presupuesto.id} presupuesto={presupuesto} />
          ))
        )}
      </div>
    </div>
  );
}
