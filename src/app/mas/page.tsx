import {
  Banknote,
  ChevronRight,
  ClipboardList,
  FileText,
  Gift,
  HardHat,
  History,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";

const LINKS = [
  {
    href: "/empleados",
    label: "Empleados",
    description: "Listado y deudas",
    icon: Users,
    color: "bg-[#0071e3]/10 text-[#0071e3]",
  },
  {
    href: "/deudas",
    label: "Deudas",
    description: "Historial y ajustes",
    icon: Banknote,
    color: "bg-[#ff3b30]/10 text-[#ff3b30]",
  },
  {
    href: "/retroactivos",
    label: "Retroactivos",
    description: "Por mes y frecuencia",
    icon: History,
    color: "bg-[#5856d6]/10 text-[#5856d6]",
  },
  {
    href: "/aguinaldos",
    label: "Aguinaldos",
    description: "Junio y diciembre",
    icon: Gift,
    color: "bg-[#ff9500]/10 text-[#c93400]",
  },
  {
    href: "/obras",
    label: "Obras",
    description: "ABM y semana por obra",
    icon: HardHat,
    color: "bg-[#34c759]/10 text-[#248a3d]",
  },
  {
    href: "/categorias",
    label: "Categorías",
    description: "Precios UOCRA por día",
    icon: Tags,
    color: "bg-[#86868b]/15 text-[#515154]",
  },
  {
    href: "/presupuestos",
    label: "Presupuestos",
    description: "Crear y descargar PDF",
    icon: FileText,
    color: "bg-[#0071e3]/10 text-[#0071e3]",
  },
  {
    href: "/listado-materiales",
    label: "Listado de materiales",
    description: "Crear y descargar PDF",
    icon: ClipboardList,
    color: "bg-[#5856d6]/10 text-[#5856d6]",
  },
];

export default function MasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Más" description="Configuración y administración" />
      <div className="ios-list">
        {LINKS.map(({ href, label, description, icon: Icon, color }) => (
          <Link key={href} href={href} className="ios-list-row group">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${color}`}
            >
              <Icon className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{label}</p>
              <p className="text-[13px] text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/70" />
          </Link>
        ))}
      </div>
    </div>
  );
}
