import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const employees = await prisma.employee.count();

    return NextResponse.json({
      status: "ok",
      database: "connected",
      employees,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
