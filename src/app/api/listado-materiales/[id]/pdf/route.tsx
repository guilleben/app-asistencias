import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { buildMaterialListPdfFilename } from "@/lib/listado-materiales";
import { ListadoMaterialesDocument } from "@/lib/pdf/listado-materiales-document";
import { registerPdfFonts } from "@/lib/pdf/register-fonts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const list = await prisma.materialList.findFirst({
    where: { id, active: true },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!list) {
    return NextResponse.json(
      { error: "Listado no encontrado" },
      { status: 404 },
    );
  }

  const pdfData = {
    owner: list.owner,
    workName: list.workName,
    location: list.location,
    date: list.date,
    items: list.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
    })),
  };

  registerPdfFonts();

  const buffer = await renderToBuffer(
    <ListadoMaterialesDocument list={pdfData} />,
  );

  const filename = buildMaterialListPdfFilename({
    date: list.date,
    owner: list.owner,
    workName: list.workName,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
