import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { PresupuestoDocument } from "@/lib/pdf/presupuesto-document";
import { registerPdfFonts } from "@/lib/pdf/register-fonts";
import { buildBudgetPdfFilename } from "@/lib/presupuestos";

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

  const budget = await prisma.budget.findFirst({
    where: { id, active: true },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!budget) {
    return NextResponse.json(
      { error: "Presupuesto no encontrado" },
      { status: 404 },
    );
  }

  const pdfData = {
    owner: budget.owner,
    workName: budget.workName,
    location: budget.location,
    date: budget.date,
    totalAmount: Number(budget.totalAmount),
    observations: budget.observations,
    items: budget.items.map((item) => ({ description: item.description })),
  };

  registerPdfFonts();

  const buffer = await renderToBuffer(
    <PresupuestoDocument budget={pdfData} />,
  );

  const filename = buildBudgetPdfFilename({
    date: budget.date,
    owner: budget.owner,
    workName: budget.workName,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
