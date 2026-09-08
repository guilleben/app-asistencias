"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  HardHat,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createSiteTool,
  deleteSiteTool,
  transferSiteTool,
  updateSiteTool,
} from "@/lib/actions/tools";
import {
  TOOL_STATUS_LABELS,
  toolMovementLabel,
  toolStatusBadgeVariant,
  toolStatusLabel,
  normalizeToolStatus,
  type ToolStatusValue,
} from "@/lib/tools";

type SiteOption = {
  id: number;
  name: string;
  toolKinds: number;
  toolUnits: number;
};

type ToolItem = {
  id: number;
  name: string;
  quantity: number;
  status: ToolStatusValue;
  note: string | null;
};

type SearchToolItem = ToolItem & {
  siteId: number;
  siteName: string;
};

type MovementItem = {
  id: number;
  toolName: string;
  kind: string;
  quantity: number;
  quantityAfter: number | null;
  status: ToolStatusValue | null;
  siteName: string;
  fromSiteName: string | null;
  toSiteName: string | null;
  note: string | null;
  createdAt: string;
};

const STATUS_OPTIONS: ToolStatusValue[] = ["OK", "IN_REPAIR", "LOST"];

function StatusSelect({
  value,
  onChange,
  id,
}: {
  value: ToolStatusValue;
  onChange: (value: ToolStatusValue) => void;
  id: string;
}) {
  return (
    <NativeSelect
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as ToolStatusValue)}
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {TOOL_STATUS_LABELS[status]}
        </option>
      ))}
    </NativeSelect>
  );
}

function ToolFormFields({
  name,
  quantity,
  status,
  note,
  onNameChange,
  onQuantityChange,
  onStatusChange,
  onNoteChange,
  idPrefix,
}: {
  name: string;
  quantity: string;
  status: ToolStatusValue;
  note: string;
  onNameChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onStatusChange: (value: ToolStatusValue) => void;
  onNoteChange: (value: string) => void;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-name`}>Herramienta</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          maxLength={100}
          placeholder="Ej: Amoladora, Escalera..."
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-qty`}>Cantidad</Label>
        <Input
          id={`${idPrefix}-qty`}
          type="number"
          inputMode="numeric"
          min={1}
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-status`}>Estado</Label>
        <StatusSelect
          id={`${idPrefix}-status`}
          value={status}
          onChange={onStatusChange}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-note`}>Nota (opcional)</Label>
        <Input
          id={`${idPrefix}-note`}
          value={note}
          maxLength={300}
          placeholder="Marca, código..."
          onChange={(e) => onNoteChange(e.target.value)}
        />
      </div>
    </>
  );
}

function NewToolDialog({ siteId }: { siteId: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState<ToolStatusValue>("OK");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (siteId <= 0) return null;

  function handleSave() {
    const qty = Math.floor(Number(quantity));
    if (!name.trim()) {
      toast.error("Ingresá el nombre de la herramienta");
      return;
    }
    if (!qty || qty <= 0) {
      toast.error("Ingresá una cantidad válida");
      return;
    }

    startTransition(async () => {
      const result = await createSiteTool({
        siteId,
        name: name.trim(),
        quantity: qty,
        status,
        note: note.trim() || undefined,
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setName("");
        setQuantity("1");
        setStatus("OK");
        setNote("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        Cargar herramienta
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva herramienta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <ToolFormFields
            idPrefix="new-tool"
            name={name}
            quantity={quantity}
            status={status}
            note={note}
            onNameChange={setName}
            onQuantityChange={setQuantity}
            onStatusChange={setStatus}
            onNoteChange={setNote}
          />
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditToolDialog({ tool }: { tool: ToolItem }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tool.name);
  const [quantity, setQuantity] = useState(String(tool.quantity));
  const [status, setStatus] = useState(normalizeToolStatus(tool.status));
  const [note, setNote] = useState(tool.note ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const qty = Math.floor(Number(quantity));
    if (!name.trim() || !qty || qty <= 0) {
      toast.error("Completá nombre y cantidad válidos");
      return;
    }

    startTransition(async () => {
      const result = await updateSiteTool({
        id: tool.id,
        name: name.trim(),
        quantity: qty,
        status,
        note: note.trim() || undefined,
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-xs" aria-label="Editar herramienta" />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar herramienta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <ToolFormFields
            idPrefix={`edit-tool-${tool.id}`}
            name={name}
            quantity={quantity}
            status={status}
            note={note}
            onNameChange={setName}
            onQuantityChange={setQuantity}
            onStatusChange={setStatus}
            onNoteChange={setNote}
          />
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferToolDialog({
  tool,
  sites,
  fromSiteId,
}: {
  tool: ToolItem;
  sites: SiteOption[];
  fromSiteId: number;
}) {
  const [open, setOpen] = useState(false);
  const [toSiteId, setToSiteId] = useState(
    sites.find((s) => s.id !== fromSiteId)?.id ?? 0,
  );
  const [quantity, setQuantity] = useState(String(tool.quantity));
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const destinations = sites.filter((s) => s.id !== fromSiteId);

  function handleSave() {
    const qty = Math.floor(Number(quantity));
    if (!toSiteId) {
      toast.error("Elegí la obra destino");
      return;
    }
    if (!qty || qty <= 0 || qty > tool.quantity) {
      toast.error("Cantidad inválida");
      return;
    }

    startTransition(async () => {
      const result = await transferSiteTool({
        id: tool.id,
        toSiteId,
        quantity: qty,
        note: note.trim() || undefined,
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  if (destinations.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-xs" aria-label="Transferir herramienta" />
        }
      >
        <ArrowRightLeft />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir — {tool.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Obra destino</Label>
            <NativeSelect
              value={toSiteId}
              onChange={(e) => setToSiteId(Number(e.target.value))}
            >
              {destinations.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label>Cantidad (máx. {tool.quantity})</Label>
            <Input
              type="number"
              min={1}
              max={tool.quantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Nota (opcional)</Label>
            <Input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={handleSave}>
            {pending ? "Transfiriendo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToolRow({
  tool,
  sites,
  fromSiteId,
}: {
  tool: ToolItem;
  sites: SiteOption[];
  fromSiteId: number;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSiteTool(tool.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{tool.name}</p>
          <Badge variant={toolStatusBadgeVariant(tool.status)}>
            {toolStatusLabel(tool.status)}
          </Badge>
        </div>
        {tool.note ? (
          <p className="text-xs text-muted-foreground">{tool.note}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Badge variant="secondary">×{tool.quantity}</Badge>
        <TransferToolDialog tool={tool} sites={sites} fromSiteId={fromSiteId} />
        <EditToolDialog tool={tool} />
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Eliminar herramienta"
        >
          <Trash2 className="text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function SiteToolsPanel({
  sites,
  selectedSiteId,
  tools,
}: {
  sites: SiteOption[];
  selectedSiteId: number;
  tools: ToolItem[];
}) {
  const router = useRouter();
  const selected = sites.find((s) => s.id === selectedSiteId);
  const totalUnits = tools.reduce((acc, t) => acc + t.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="tool-site">Obra</Label>
          <NativeSelect
            id="tool-site"
            value={selectedSiteId}
            onChange={(e) =>
              router.push(`/herramientas?site=${Number(e.target.value)}`)
            }
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
                {site.toolUnits > 0
                  ? ` (${site.toolKinds} tipos, ${site.toolUnits} u.)`
                  : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button render={<Link href="/obras" />} variant="outline" size="sm">
          <HardHat data-icon="inline-start" />
          Obras
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selected?.name}:{" "}
          <span className="font-medium text-foreground">
            {tools.length === 0
              ? "sin herramientas"
              : `${tools.length} ${tools.length === 1 ? "tipo" : "tipos"}, ${totalUnits} unidades`}
          </span>
        </p>
        <NewToolDialog siteId={selectedSiteId} />
      </div>

      <div className="surface divide-y px-4">
        {selectedSiteId <= 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Elegí una obra para ver herramientas.
          </p>
        ) : tools.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay herramientas en esta obra.
          </p>
        ) : (
          tools.map((tool) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              sites={sites}
              fromSiteId={selectedSiteId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SummaryPanel({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const totals = sites.reduce(
    (acc, s) => ({
      kinds: acc.kinds + s.toolKinds,
      units: acc.units + s.toolUnits,
    }),
    { kinds: 0, units: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <p className="label-caption text-muted-foreground">Tipos en total</p>
          <p className="stat-value mt-1">{totals.kinds}</p>
        </div>
        <div className="stat-card">
          <p className="label-caption text-muted-foreground">Unidades totales</p>
          <p className="stat-value mt-1">{totals.units}</p>
        </div>
      </div>
      <div className="surface divide-y">
        {sites.map((site) => (
          <button
            key={site.id}
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
            onClick={() => router.push(`/herramientas?site=${site.id}`)}
          >
            <span className="font-medium">{site.name}</span>
            <span className="text-muted-foreground">
              {site.toolKinds === 0
                ? "Sin herramientas"
                : `${site.toolKinds} tipos · ${site.toolUnits} u.`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchPanel({
  allTools,
  query,
  onQueryChange,
}: {
  allTools: SearchToolItem[];
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const router = useRouter();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allTools;
    return allTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.siteName.toLowerCase().includes(q) ||
        (t.note?.toLowerCase().includes(q) ?? false),
    );
  }, [allTools, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar herramienta u obra..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="surface divide-y">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No se encontraron herramientas.
          </p>
        ) : (
          filtered.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
              onClick={() => router.push(`/herramientas?site=${tool.siteId}`)}
            >
              <div className="min-w-0">
                <p className="font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground">{tool.siteName}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={toolStatusBadgeVariant(tool.status)}>
                  {TOOL_STATUS_LABELS[tool.status]}
                </Badge>
                <Badge variant="secondary">×{tool.quantity}</Badge>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryPanel({ movements }: { movements: MovementItem[] }) {
  return (
    <div className="surface divide-y">
      {movements.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Sin movimientos registrados.
        </p>
      ) : (
        movements.map((m) => (
          <div key={m.id} className="space-y-1 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{m.toolName}</p>
              <Badge variant="outline">{toolMovementLabel(m.kind)}</Badge>
              <span className="text-muted-foreground">×{m.quantity}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(m.createdAt).toLocaleString("es-AR")}
              {" · "}
              {m.siteName}
              {m.fromSiteName && m.toSiteName
                ? ` · ${m.fromSiteName} → ${m.toSiteName}`
                : ""}
              {m.quantityAfter !== null ? ` · queda ${m.quantityAfter}` : ""}
            </p>
            {m.note ? (
              <p className="text-xs text-muted-foreground">{m.note}</p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

export function ToolManager({
  sites,
  selectedSiteId,
  tools,
  allTools,
  movements,
}: {
  sites: SiteOption[];
  selectedSiteId: number;
  tools: ToolItem[];
  allTools: SearchToolItem[];
  movements: MovementItem[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  if (sites.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          No hay obras activas. Creá una para cargar herramientas.
        </p>
        <Button render={<Link href="/obras" />}>
          <HardHat data-icon="inline-start" />
          Ir a Obras
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="obra">
      <TabsList className="w-full">
        <TabsTrigger value="obra">Por obra</TabsTrigger>
        <TabsTrigger value="resumen">Resumen</TabsTrigger>
        <TabsTrigger value="buscar">Buscar</TabsTrigger>
        <TabsTrigger value="historial">Historial</TabsTrigger>
      </TabsList>

      <TabsContent value="obra" className="mt-4">
        <SiteToolsPanel
          sites={sites}
          selectedSiteId={selectedSiteId}
          tools={tools}
        />
      </TabsContent>

      <TabsContent value="resumen" className="mt-4">
        <SummaryPanel sites={sites} />
      </TabsContent>

      <TabsContent value="buscar" className="mt-4">
        <SearchPanel
          allTools={allTools}
          query={searchQuery}
          onQueryChange={setSearchQuery}
        />
      </TabsContent>

      <TabsContent value="historial" className="mt-4">
        <HistoryPanel movements={movements} />
      </TabsContent>
    </Tabs>
  );
}
