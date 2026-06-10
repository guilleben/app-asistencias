import {
  BarChart3,
  CalendarCheck,
  ChevronRight,
  HardHat,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import {
  addDaysIso,
  formatIsoShort,
  isoToDb,
  todayIso,
  weekStartIso,
} from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatARS } from "@/lib/format";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  {
    href: "/asistencias",
    label: "Asistencias",
    description: "Marcar presentes",
    icon: CalendarCheck,
    color: "bg-[#0071e3]/10 text-[#0071e3]",
  },
  {
    href: "/pagos",
    label: "Pagos",
    description: "Liquidar semana",
    icon: Wallet,
    color: "bg-[#34c759]/10 text-[#248a3d]",
  },
  {
    href: "/obras",
    label: "Obras",
    description: "Ver asignaciones",
    icon: HardHat,
    color: "bg-[#ff9500]/10 text-[#c93400]",
  },
  {
    href: "/estadisticas",
    label: "Estadísticas",
    description: "Gastos y deudas",
    icon: BarChart3,
    color: "bg-[#5856d6]/10 text-[#5856d6]",
  },
];

export default async function HomePage() {
  const weekStart = weekStartIso(todayIso());
  const weekEnd = addDaysIso(weekStart, 4);

  const [shiftsThisWeek, paidThisWeek, debtTotal, activeEmployees] =
    await Promise.all([
      prisma.attendance.count({
        where: {
          present: true,
          date: { gte: isoToDb(weekStart), lte: isoToDb(weekEnd) },
        },
      }),
      prisma.payment.aggregate({
        where: { weekStart: isoToDb(weekStart) },
        _sum: { totalPaid: true },
        _count: { _all: true },
      }),
      prisma.debtMovement.aggregate({ _sum: { amount: true } }),
      prisma.employee.count({ where: { active: true } }),
    ]);

  const stats = [
    { label: "Empleados", value: String(activeEmployees) },
    { label: "Turnos", value: String(shiftsThisWeek) },
    {
      label: "Pagado",
      value: formatARS(Number(paidThisWeek._sum.totalPaid ?? 0)),
      sub: `${paidThisWeek._count._all} de ${activeEmployees}`,
    },
    {
      label: "Deuda total de secretarios",
      value: formatARS(Number(debtTotal._sum.amount ?? 0)),
      accent: true,
    },
  ];

  return (
    <div className="space-y-8">
      <p className="text-[20px] font-bold leading-tight tracking-tight text-foreground sm:text-[22px]">
        Semana del {formatIsoShort(weekStart)} al {formatIsoShort(weekEnd)}
      </p>

      <div className="stat-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <p
              className={`label-caption font-semibold ${stat.accent ? "text-destructive" : ""}`}
            >
              {stat.label}
            </p>
            <p
              className={`stat-value mt-1 ${stat.accent ? "!text-destructive" : ""}`}
            >
              {stat.value}
            </p>
            {stat.sub && (
              <p className="mt-1 text-[11px] text-muted-foreground">{stat.sub}</p>
            )}
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Accesos rápidos
        </h2>
        <div className="ios-list">
          {QUICK_LINKS.map(({ href, label, description, icon: Icon, color }) => (
            <Link key={href} href={href} className="ios-list-row group">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${color}`}
              >
                <Icon className="size-[18px]" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-foreground">{label}</p>
                <p className="text-[13px] text-muted-foreground">{description}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/70 transition-transform group-active:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
