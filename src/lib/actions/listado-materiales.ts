"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { isoToDb } from "@/lib/dates";
import { prisma } from "@/lib/db";

const itemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.string().trim().min(1).max(50),
});

const materialListSchema = z.object({
  owner: z.string().trim().min(1).max(200),
  workName: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(itemSchema).min(1),
});

export type MaterialListInput = z.infer<typeof materialListSchema>;

function parseMaterialListInput(
  input: MaterialListInput,
):
  | { ok: false; message: string }
  | {
      ok: true;
      data: MaterialListInput & {
        items: { description: string; quantity: string }[];
      };
    } {
  const parsed = materialListSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Datos del listado inválidos" };
  }

  const items = parsed.data.items.filter(
    (item) => item.description.trim() && item.quantity.trim(),
  );
  if (items.length === 0) {
    return { ok: false, message: "Agregá al menos un ítem con descripción y cantidad" };
  }

  return { ok: true, data: { ...parsed.data, items } };
}

export async function createMaterialList(
  input: MaterialListInput,
): Promise<ActionResult> {
  const result = parseMaterialListInput(input);
  if (!result.ok) return fail(result.message);

  const { owner, workName, location, date, items } = result.data;

  try {
    await prisma.materialList.create({
      data: {
        owner,
        workName,
        location,
        date: isoToDb(date),
        items: {
          create: items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            sortOrder: index,
          })),
        },
      },
    });
    revalidatePath("/", "layout");
    return ok("Listado creado");
  } catch {
    return fail("No se pudo crear el listado");
  }
}

export async function updateMaterialList(
  id: number,
  input: MaterialListInput,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Listado inválido");

  const result = parseMaterialListInput(input);
  if (!result.ok) return fail(result.message);

  const { owner, workName, location, date, items } = result.data;

  try {
    const existing = await prisma.materialList.findFirst({
      where: { id, active: true },
    });
    if (!existing) return fail("Listado no encontrado");

    await prisma.$transaction([
      prisma.materialList.update({
        where: { id },
        data: {
          owner,
          workName,
          location,
          date: isoToDb(date),
        },
      }),
      prisma.materialListItem.deleteMany({ where: { materialListId: id } }),
      prisma.materialListItem.createMany({
        data: items.map((item, index) => ({
          materialListId: id,
          description: item.description,
          quantity: item.quantity,
          sortOrder: index,
        })),
      }),
    ]);
    revalidatePath("/", "layout");
    return ok("Listado actualizado");
  } catch {
    return fail("No se pudo actualizar el listado");
  }
}

export async function deleteMaterialList(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Listado inválido");

  try {
    const existing = await prisma.materialList.findFirst({
      where: { id, active: true },
    });
    if (!existing) return fail("Listado no encontrado");

    await prisma.materialList.update({
      where: { id },
      data: { active: false },
    });
    revalidatePath("/", "layout");
    return ok("Listado eliminado");
  } catch {
    return fail("No se pudo eliminar el listado");
  }
}
