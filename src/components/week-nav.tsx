import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  addDaysIso,
  formatIsoShort,
  todayIso,
  weekStartIso,
} from "@/lib/dates";

export function WeekNav({
  weekStart,
  basePath,
}: {
  weekStart: string;
  basePath: string;
}) {
  const prev = addDaysIso(weekStart, -7);
  const next = addDaysIso(weekStart, 7);
  const currentWeek = weekStartIso(todayIso());
  const isCurrent = weekStart === currentWeek;

  return (
    <div className="surface flex items-center gap-1 p-1">
      <Button
        variant="ghost"
        size="icon-sm"
        render={<Link href={`${basePath}?week=${prev}`} />}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant={isCurrent ? "secondary" : "ghost"}
        size="sm"
        className="flex-1 rounded-xl"
        render={<Link href={basePath} />}
      >
        {formatIsoShort(weekStart)} – {formatIsoShort(addDaysIso(weekStart, 4))}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        render={<Link href={`${basePath}?week=${next}`} />}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
