"use client";

import { Download, Loader2, Minus, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createMaterialList,
  deleteMaterialList,
  updateMaterialList,
  type MaterialListInput,
} from "@/lib/actions/listado-materiales";
import { downloadOrShareMaterialListPdf } from "@/lib/download-material-list-pdf";
import { formatIsoLong, todayIso } from "@/lib/dates";

type MaterialItem = {
  description: string;
  quantity: string;
};

export type ListadoMaterialesItem = {
  id: number;
  owner: string;
  workName: string;
  location: string;
  date: string;
  items: MaterialItem[];
};

type FormState = {
  owner: string;
  workName: string;
  location: string;
  date: string;
  items: MaterialItem[];
};

function emptyForm(): FormState {
  return {
    owner: "",
    workName: "",
    location: "",
    date: todayIso(),
    items: [{ description: "", quantity: "" }],
  };
}

function formFromListado(listado: ListadoMaterialesItem): FormState {
  return {
    owner: listado.owner,
    workName: listado.workName,
    location: listado.location,
    date: listado.date,
    items:
      listado.items.length > 0
        ? listado.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
          }))
        : [{ description: "", quantity: "" }],
  };
}

function formToInput(
  form: FormState,
): { ok: true; input: MaterialListInput } | { ok: false; message: string } {
  if (
    !form.owner.trim() ||
    !form.workName.trim() ||
    !form.location.trim() ||
    !form.date
  ) {
    return {
      ok: false,
      message: "Completá propietario, obra, ubicación y fecha",
    };
  }

  const trimmed = form.items.map((item) => ({
    description: item.description.trim(),
    quantity: item.quantity.trim(),
  }));

  const incompleteRow = trimmed.findIndex(
    (item) => Boolean(item.description) !== Boolean(item.quantity),
  );
  if (incompleteRow !== -1) {
    const missing = trimmed[incompleteRow].description
      ? "la cantidad"
      : "la descripción";
    return {
      ok: false,
      message: `Falta ${missing} en el ítem ${incompleteRow + 1}`,
    };
  }

  // Fully empty rows are ignored.
  const items = trimmed.filter((item) => item.description && item.quantity);
  if (items.length === 0) {
    return {
      ok: false,
      message: "Agregá al menos un ítem con descripción y cantidad",
    };
  }

  return {
    ok: true,
    input: {
      owner: form.owner.trim(),
      workName: form.workName.trim(),
      location: form.location.trim(),
      date: form.date,
      items,
    },
  };
}

function ListadoFormFields({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  function updateItem(
    index: number,
    field: keyof MaterialItem,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addItem(afterIndex?: number) {
    setForm((prev) => {
      const items = [...prev.items];
      const index = afterIndex ?? items.length - 1;
      items.splice(index + 1, 0, { description: "", quantity: "" });
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
        <Label htmlFor="list-owner">Propietario</Label>
        <Input
          id="list-owner"
          value={form.owner}
          maxLength={200}
          onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="list-work">Obra</Label>
        <Input
          id="list-work"
          value={form.workName}
          maxLength={200}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, workName: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="list-location">Ubicación</Label>
        <Input
          id="list-location"
          value={form.location}
          maxLength={200}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, location: e.target.value }))
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="list-date">Fecha</Label>
        <Input
          id="list-date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Ítems</Label>
        {form.items.map((item, index) => (
          <div
            key={index}
            className="space-y-2 rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Ítem {index + 1}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Agregar ítem debajo del ${index + 1}`}
                  onClick={() => addItem(index)}
                >
                  <Plus />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Quitar ítem ${index + 1}`}
                  disabled={form.items.length <= 1}
                  onClick={() => removeItem(index)}
                >
                  <Minus />
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem] sm:items-start">
              <Textarea
                autoGrow
                rows={2}
                value={item.description}
                maxLength={500}
                placeholder="Descripción del material"
                aria-label={`Descripción del ítem ${index + 1}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                onChange={(e) =>
                  updateItem(
                    index,
                    "description",
                    e.target.value.replace(/[\r\n]+/g, " "),
                  )
                }
              />
              <Input
                value={item.quantity}
                maxLength={50}
                placeholder="Cantidad"
                aria-label={`Cantidad del ítem ${index + 1}`}
                onChange={(e) => updateItem(index, "quantity", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListadoFormDialog({
  listado,
  trigger,
}: {
  listado?: ListadoMaterialesItem;
  trigger: React.ReactElement;
}) {
  const isEdit = Boolean(listado);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    listado ? formFromListado(listado) : emptyForm(),
  );
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setForm(listado ? formFromListado(listado) : emptyForm());
    }
  }

  function handleSave() {
    const parsed = formToInput(form);
    if (!parsed.ok) {
      toast.error(parsed.message);
      return;
    }
    const { input } = parsed;

    startTransition(async () => {
      const result = isEdit
        ? await updateMaterialList(listado!.id, input)
        : await createMaterialList(input);

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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar listado" : "Nuevo listado"}
          </DialogTitle>
        </DialogHeader>
        <ListadoFormFields form={form} setForm={setForm} />
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListadoCard({ listado }: { listado: ListadoMaterialesItem }) {
  const [pending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const result = await downloadOrShareMaterialListPdf({
        id: listado.id,
        date: listado.date,
        owner: listado.owner,
        workName: listado.workName,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (result.method === "open") {
        toast.info("Usá Compartir del visor para guardar o enviar el PDF");
      }
    } finally {
      setDownloading(false);
    }
  }

  function handleDelete() {
    if (!confirm("¿Eliminar este listado?")) return;

    startTransition(async () => {
      const result = await deleteMaterialList(listado.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">{listado.owner}</p>
          <p className="text-xs text-muted-foreground">
            {listado.workName} · {listado.location}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatIsoLong(listado.date)}
          </p>
          <p className="text-xs text-muted-foreground">
            {listado.items.length} ítem{listado.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Descargar PDF"
            disabled={downloading || pending}
            onClick={handleDownloadPdf}
          >
            {downloading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download />
            )}
          </Button>
          <ListadoFormDialog
            listado={listado}
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

export function ListadoMaterialesManager({
  listados,
}: {
  listados: ListadoMaterialesItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ListadoFormDialog
          trigger={
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Nuevo listado
            </Button>
          }
        />
      </div>
      <div className="space-y-3">
        {listados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay listados creados.
          </p>
        ) : (
          listados.map((listado) => (
            <ListadoCard key={listado.id} listado={listado} />
          ))
        )}
      </div>
    </div>
  );
}
