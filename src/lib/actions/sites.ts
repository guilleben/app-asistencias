"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { prisma } from "@/lib/db";

const nameSchema = z.string().trim().min(1).max(100);

export async function createSite(name: string): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail("Nombre de obra inválido");

  try {
    await prisma.site.create({ data: { name: parsed.data } });
    revalidatePath("/", "layout");
    return ok("Obra creada");
  } catch {
    return fail("No se pudo crear la obra (¿nombre duplicado?)");
  }
}

export async function renameSite(
  id: number,
  name: string,
): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success || !Number.isInteger(id) || id <= 0) {
    return fail("Datos inválidos");
  }

  try {
    await prisma.site.update({ where: { id }, data: { name: parsed.data } });
    revalidatePath("/", "layout");
    return ok("Obra renombrada");
  } catch {
    return fail("No se pudo renombrar la obra");
  }
}

export async function toggleSite(
  id: number,
  active: boolean,
): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Obra inválida");

  try {
    await prisma.site.update({ where: { id }, data: { active } });
    revalidatePath("/", "layout");
    return ok(active ? "Obra activada" : "Obra archivada");
  } catch {
    return fail("No se pudo actualizar la obra");
  }
}

export async function deleteSite(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return fail("Obra inválida");

  try {
    const usage = await prisma.attendance.count({ where: { siteId: id } });
    if (usage > 0) {
      return fail("La obra tiene asistencias asociadas; archivala en su lugar");
    }

    await prisma.site.delete({ where: { id } });
    revalidatePath("/", "layout");
    return ok("Obra eliminada");
  } catch {
    return fail("No se pudo eliminar la obra");
  }
}
