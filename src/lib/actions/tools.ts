"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db";
import type { ToolMovementKind, ToolStatus } from "@/generated/prisma/client";

const nameSchema = z.string().trim().min(1).max(100);
const noteSchema = z.string().trim().max(300).optional();
const statusSchema = z.enum(["OK", "IN_REPAIR", "LOST"]);

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function logToolMovement(
  tx: Tx,
  data: {
    siteToolId?: number | null;
    siteId: number;
    toolName: string;
    kind: ToolMovementKind;
    quantity: number;
    quantityAfter?: number | null;
    status?: ToolStatus | null;
    fromSiteId?: number | null;
    toSiteId?: number | null;
    note?: string | null;
  },
) {
  await tx.siteToolMovement.create({
    data: {
      siteToolId: data.siteToolId ?? null,
      siteId: data.siteId,
      toolName: data.toolName,
      kind: data.kind,
      quantity: data.quantity,
      quantityAfter: data.quantityAfter ?? null,
      status: data.status ?? null,
      fromSiteId: data.fromSiteId ?? null,
      toSiteId: data.toSiteId ?? null,
      note: data.note ?? null,
    },
  });
}

const createSchema = z.object({
  siteId: z.number().int().positive(),
  name: nameSchema,
  quantity: z.number().int().positive(),
  status: statusSchema.optional(),
  note: noteSchema,
});

export async function createSiteTool(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de herramienta inválidos");

  const { siteId, name, quantity, status = "OK", note } = parsed.data;

  try {
    const site = await prisma.site.findFirst({
      where: { id: siteId, active: true },
    });
    if (!site) return fail("Obra no encontrada o archivada");

    await prisma.$transaction(async (tx) => {
      const tool = await tx.siteTool.create({
        data: { siteId, name, quantity, status, note: note || null },
      });
      await logToolMovement(tx, {
        siteToolId: tool.id,
        siteId,
        toolName: name,
        kind: "CREATED",
        quantity,
        quantityAfter: quantity,
        status,
        note: note || null,
      });
    });

    revalidatePath("/", "layout");
    return ok("Herramienta cargada");
  } catch {
    return fail("No se pudo cargar (¿ya existe en esta obra?)");
  }
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: nameSchema,
  quantity: z.number().int().positive(),
  status: statusSchema,
  note: noteSchema,
});

export async function updateSiteTool(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return fail("Datos inválidos");

  const { id, name, quantity, status, note } = parsed.data;

  try {
    const tool = await prisma.siteTool.findUnique({ where: { id } });
    if (!tool) return fail("Herramienta no encontrada");

    await prisma.$transaction(async (tx) => {
      await tx.siteTool.update({
        where: { id },
        data: { name, quantity, status, note: note ?? null },
      });

      const changed =
        tool.name !== name ||
        tool.quantity !== quantity ||
        (note ?? null) !== (tool.note ?? null);

      if (changed) {
        await logToolMovement(tx, {
          siteToolId: id,
          siteId: tool.siteId,
          toolName: name,
          kind: "UPDATED",
          quantity,
          quantityAfter: quantity,
          status,
          note: note ?? null,
        });
      }

      if (tool.status !== status) {
        await logToolMovement(tx, {
          siteToolId: id,
          siteId: tool.siteId,
          toolName: name,
          kind: "STATUS_CHANGED",
          quantity,
          quantityAfter: quantity,
          status,
          note: `Estado: ${tool.status} → ${status}`,
        });
      }
    });

    revalidatePath("/", "layout");
    return ok("Herramienta actualizada");
  } catch {
    return fail("No se pudo actualizar (¿nombre duplicado en la obra?)");
  }
}

export async function deleteSiteTool(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Herramienta inválida");

  try {
    await prisma.$transaction(async (tx) => {
      const tool = await tx.siteTool.findUnique({ where: { id } });
      if (!tool) throw new Error("missing");

      await logToolMovement(tx, {
        siteToolId: id,
        siteId: tool.siteId,
        toolName: tool.name,
        kind: "DELETED",
        quantity: tool.quantity,
        quantityAfter: 0,
        status: tool.status,
      });
      await tx.siteTool.delete({ where: { id } });
    });

    revalidatePath("/", "layout");
    return ok("Herramienta eliminada");
  } catch {
    return fail("No se pudo eliminar la herramienta");
  }
}

const transferSchema = z.object({
  id: z.number().int().positive(),
  toSiteId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  note: noteSchema,
});

export async function transferSiteTool(
  input: z.infer<typeof transferSchema>,
): Promise<ActionResult> {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return fail("Datos de transferencia inválidos");

  const { id, toSiteId, quantity, note } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const tool = await tx.siteTool.findUnique({ where: { id } });
      if (!tool) throw new Error("missing");
      if (tool.siteId === toSiteId) throw new Error("same-site");
      if (quantity > tool.quantity) throw new Error("qty");

      const toSite = await tx.site.findFirst({
        where: { id: toSiteId, active: true },
      });
      if (!toSite) throw new Error("dest");

      const dest = await tx.siteTool.findUnique({
        where: { siteId_name: { siteId: toSiteId, name: tool.name } },
      });

      const fromAfter = tool.quantity - quantity;

      if (fromAfter === 0) {
        await tx.siteTool.delete({ where: { id } });
      } else {
        await tx.siteTool.update({
          where: { id },
          data: { quantity: fromAfter },
        });
      }

      let destId: number;
      let destAfter: number;

      if (dest) {
        destAfter = dest.quantity + quantity;
        await tx.siteTool.update({
          where: { id: dest.id },
          data: { quantity: destAfter },
        });
        destId = dest.id;
      } else {
        const created = await tx.siteTool.create({
          data: {
            siteId: toSiteId,
            name: tool.name,
            quantity,
            status: tool.status,
            note: tool.note,
          },
        });
        destId = created.id;
        destAfter = quantity;
      }

      const moveNote = note || null;

      await logToolMovement(tx, {
        siteToolId: fromAfter === 0 ? null : id,
        siteId: tool.siteId,
        toolName: tool.name,
        kind: "TRANSFER_OUT",
        quantity,
        quantityAfter: fromAfter,
        status: tool.status,
        fromSiteId: tool.siteId,
        toSiteId,
        note: moveNote,
      });

      await logToolMovement(tx, {
        siteToolId: destId,
        siteId: toSiteId,
        toolName: tool.name,
        kind: "TRANSFER_IN",
        quantity,
        quantityAfter: destAfter,
        status: tool.status,
        fromSiteId: tool.siteId,
        toSiteId,
        note: moveNote,
      });
    });

    revalidatePath("/", "layout");
    return ok("Herramienta transferida");
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "same-site") {
        return fail("Elegí una obra distinta");
      }
      if (e.message === "qty") {
        return fail("La cantidad supera el stock en la obra");
      }
      if (e.message === "dest") {
        return fail("Obra destino no encontrada o archivada");
      }
    }
    return fail("No se pudo transferir la herramienta");
  }
}
