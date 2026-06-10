"use client";

import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import {
  createSite,
  deleteSite,
  renameSite,
  toggleSite,
} from "@/lib/actions/sites";

type SiteItem = {
  id: number;
  name: string;
  active: boolean;
  weekEmployees: { name: string; shifts: number }[];
};

function NewSiteDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }
    startTransition(async () => {
      const result = await createSite(name);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setName("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        Nueva obra
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva obra</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="site-name">Nombre</Label>
          <Input
            id="site-name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Creando..." : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SiteCard({ site }: { site: SiteItem }) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(site.name);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        setEditOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{site.name}</p>
          {!site.active && <Badge variant="outline">Archivada</Badge>}
        </div>
        <div className="flex gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <Pencil />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Renombrar obra</DialogTitle>
              </DialogHeader>
              <Input
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
              <DialogFooter>
                <Button
                  disabled={pending}
                  onClick={() => run(() => renameSite(site.id, name))}
                >
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => run(() => toggleSite(site.id, !site.active))}
            aria-label={site.active ? "Archivar" : "Restaurar"}
          >
            {site.active ? <Archive /> : <ArchiveRestore />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={() => run(() => deleteSite(site.id))}
            aria-label="Eliminar"
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      </div>

      {site.weekEmployees.length > 0 && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {site.weekEmployees.map((employee) => (
            <div
              key={employee.name}
              className="flex items-center justify-between text-xs"
            >
              <span>{employee.name}</span>
              <span className="text-muted-foreground">
                {employee.shifts} {employee.shifts === 1 ? "turno" : "turnos"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteManager({ sites }: { sites: SiteItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewSiteDialog />
      </div>
      <div className="space-y-3">
        {sites.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay obras creadas.
          </p>
        ) : (
          sites.map((site) => <SiteCard key={site.id} site={site} />)
        )}
      </div>
    </div>
  );
}
