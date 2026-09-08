import { ToolManager } from "@/components/tools/tool-manager";
import { PageHeader } from "@/components/page-header";
import { normalizeToolStatus } from "@/lib/tools";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HerramientasPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const { site } = await searchParams;

  const [sites, allSites, toolStats, allTools, movements] = await Promise.all([
    prisma.site.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findMany({ select: { id: true, name: true } }),
    prisma.siteTool.groupBy({
      by: ["siteId"],
      where: { active: true },
      _count: { _all: true },
      _sum: { quantity: true },
    }),
    prisma.siteTool.findMany({
      where: { active: true },
      include: { site: { select: { name: true } } },
      orderBy: [{ site: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.siteToolMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { site: { select: { name: true } } },
    }),
  ]);

  const siteNameById = new Map(allSites.map((s) => [s.id, s.name]));

  const statsBySite = new Map(
    toolStats.map((row) => [
      row.siteId,
      {
        toolKinds: row._count._all,
        toolUnits: Number(row._sum.quantity ?? 0),
      },
    ]),
  );

  const siteOptions = sites.map((s) => ({
    id: s.id,
    name: s.name,
    toolKinds: statsBySite.get(s.id)?.toolKinds ?? 0,
    toolUnits: statsBySite.get(s.id)?.toolUnits ?? 0,
  }));

  const parsedSiteId = site ? Number(site) : NaN;
  const selectedSiteId =
    siteOptions.find((s) => s.id === parsedSiteId)?.id ?? siteOptions[0]?.id;

  const tools = selectedSiteId
    ? await prisma.siteTool.findMany({
        where: { siteId: selectedSiteId, active: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Herramientas"
        description="Inventario, búsqueda y movimientos por obra"
      />
      <ToolManager
        sites={siteOptions}
        selectedSiteId={selectedSiteId ?? 0}
        tools={tools.map((t) => ({
          id: t.id,
          name: t.name,
          quantity: t.quantity,
          status: normalizeToolStatus(t.status),
          note: t.note,
        }))}
        allTools={allTools.map((t) => ({
          id: t.id,
          siteId: t.siteId,
          siteName: t.site.name,
          name: t.name,
          quantity: t.quantity,
          status: normalizeToolStatus(t.status),
          note: t.note,
        }))}
        movements={movements.map((m) => ({
          id: m.id,
          toolName: m.toolName,
          kind: m.kind,
          quantity: m.quantity,
          quantityAfter: m.quantityAfter,
          status: m.status,
          siteName: m.site.name,
          fromSiteName: m.fromSiteId
            ? (siteNameById.get(m.fromSiteId) ?? null)
            : null,
          toSiteName: m.toSiteId
            ? (siteNameById.get(m.toSiteId) ?? null)
            : null,
          note: m.note,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
