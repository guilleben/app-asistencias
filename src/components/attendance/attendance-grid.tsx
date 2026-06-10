"use client";

import { Check, Users, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  markAllPresent,
  setAttendance,
  setAttendanceSite,
} from "@/lib/actions/attendance";
import { formatIsoShort, todayIso, weekDaysIso } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Shift = "MORNING" | "AFTERNOON";

type EmployeeItem = { id: number; name: string; category: string };
type SiteItem = { id: number; name: string };
type RecordItem = {
  employeeId: number;
  date: string;
  shift: Shift;
  present: boolean;
  siteId: number | null;
};

type CellState = { present: boolean; siteId: number | null };

const SHIFTS: { value: Shift; label: string }[] = [
  { value: "MORNING", label: "Mañana" },
  { value: "AFTERNOON", label: "Tarde" },
];

const SHIFT_MARK_ALL_LABEL: Record<
  Shift,
  { all: string; none: string }
> = {
  MORNING: {
    all: "Todos presentes medio día",
    none: "Quitar medio día",
  },
  AFTERNOON: {
    all: "Todos presentes media tarde",
    none: "Quitar media tarde",
  },
};

function cellKey(employeeId: number, date: string, shift: Shift): string {
  return `${employeeId}|${date}|${shift}`;
}

export function AttendanceGrid({
  weekStart,
  employees,
  sites,
  records,
}: {
  weekStart: string;
  employees: EmployeeItem[];
  sites: SiteItem[];
  records: RecordItem[];
}) {
  const days = useMemo(() => weekDaysIso(weekStart), [weekStart]);
  const today = todayIso();
  const initialDay = days.includes(today) ? today : days[0];
  const [activeDay, setActiveDay] = useState(initialDay);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setActiveDay(initialDay);
  }, [initialDay]);

  const [cells, setCells] = useState<Map<string, CellState>>(() => {
    const map = new Map<string, CellState>();
    for (const r of records) {
      map.set(cellKey(r.employeeId, r.date, r.shift), {
        present: r.present,
        siteId: r.siteId,
      });
    }
    return map;
  });

  useEffect(() => {
    const map = new Map<string, CellState>();
    for (const r of records) {
      map.set(cellKey(r.employeeId, r.date, r.shift), {
        present: r.present,
        siteId: r.siteId,
      });
    }
    setCells(map);
  }, [records]);

  function getCell(employeeId: number, date: string, shift: Shift): CellState {
    return (
      cells.get(cellKey(employeeId, date, shift)) ?? {
        present: false,
        siteId: null,
      }
    );
  }

  function updateCell(
    employeeId: number,
    date: string,
    shift: Shift,
    state: CellState,
  ) {
    setCells((prev) => {
      const next = new Map(prev);
      next.set(cellKey(employeeId, date, shift), state);
      return next;
    });
  }

  function togglePresent(employeeId: number, date: string, shift: Shift) {
    const current = getCell(employeeId, date, shift);
    const next = { ...current, present: !current.present };
    updateCell(employeeId, date, shift, next);

    startTransition(async () => {
      const result = await setAttendance({
        employeeId,
        date,
        shift,
        present: next.present,
        siteId: next.siteId,
      });
      if (!result.ok) {
        updateCell(employeeId, date, shift, current);
        toast.error(result.message);
      }
    });
  }

  function changeSite(
    employeeId: number,
    date: string,
    shift: Shift,
    siteId: number | null,
  ) {
    const current = getCell(employeeId, date, shift);
    updateCell(employeeId, date, shift, { present: true, siteId });

    startTransition(async () => {
      const result = await setAttendanceSite({
        employeeId,
        date,
        shift,
        siteId,
      });
      if (!result.ok) {
        updateCell(employeeId, date, shift, current);
        toast.error(result.message);
      }
    });
  }

  function areAllPresent(date: string, shift: Shift | null): boolean {
    const shifts = shift ? [shift] : (["MORNING", "AFTERNOON"] as Shift[]);
    return employees.every((employee) =>
      shifts.every((s) => getCell(employee.id, date, s).present),
    );
  }

  function markAll(date: string, shift: Shift | null) {
    const shifts = shift ? [shift] : (["MORNING", "AFTERNOON"] as Shift[]);
    const nextPresent = !areAllPresent(date, shift);
    const previous = new Map(cells);

    setCells((prev) => {
      const next = new Map(prev);
      for (const employee of employees) {
        for (const s of shifts) {
          const key = cellKey(employee.id, date, s);
          const current = next.get(key);
          next.set(key, {
            present: nextPresent,
            siteId: current?.siteId ?? null,
          });
        }
      }
      return next;
    });

    startTransition(async () => {
      const result = await markAllPresent({ date, shift, present: nextPresent });
      if (result.ok) {
        toast.success(result.message);
      } else {
        setCells(previous);
        toast.error(result.message);
      }
    });
  }

  return (
    <Tabs value={activeDay} onValueChange={setActiveDay}>
      <TabsList className="w-full">
        {days.map((day) => (
          <TabsTrigger key={day} value={day} className="capitalize">
            {formatIsoShort(day).split(" ")[0]}
          </TabsTrigger>
        ))}
      </TabsList>

      {days.map((day) => (
        <TabsContent key={day} value={day} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium capitalize text-muted-foreground">
              {formatIsoShort(day)}
            </p>
            <Button size="sm" variant="secondary" onClick={() => markAll(day, null)}>
              <Users data-icon="inline-start" />
              {areAllPresent(day, null) ? "Quitar presentes" : "Todos presentes"}
            </Button>
          </div>

          {SHIFTS.map(({ value: shift, label }) => (
            <div key={shift} className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-2.5">
                <span className="text-[15px] font-semibold tracking-tight">
                  {label}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-auto max-w-[58%] whitespace-normal py-1 text-right leading-tight"
                  onClick={() => markAll(day, shift)}
                >
                  {areAllPresent(day, shift)
                    ? SHIFT_MARK_ALL_LABEL[shift].none
                    : SHIFT_MARK_ALL_LABEL[shift].all}
                </Button>
              </div>
              <div className="divide-y divide-border/60">
                {employees.map((employee) => {
                  const cell = getCell(employee.id, day, shift);
                  return (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => togglePresent(employee.id, day, shift)}
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95",
                          cell.present
                            ? "bg-success text-white shadow-sm"
                            : "bg-muted text-muted-foreground",
                        )}
                        aria-label={cell.present ? "Presente" : "Ausente"}
                      >
                        {cell.present ? (
                          <Check className="size-4" strokeWidth={2.5} />
                        ) : (
                          <X className="size-4" strokeWidth={2} />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium">
                          {employee.name}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          {employee.category}
                        </p>
                      </div>
                      {cell.present && (
                        <NativeSelect
                          className="w-32 shrink-0"
                          value={cell.siteId ?? ""}
                          onChange={(event) =>
                            changeSite(
                              employee.id,
                              day,
                              shift,
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                        >
                          <option value="">Sin obra</option>
                          {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name}
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
