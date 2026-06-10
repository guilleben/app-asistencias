import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";

const TIMEZONE = "America/Argentina/Buenos_Aires";

export type DateRange = {
  start: Date;
  end: Date;
};

export function getWeekRange(date: Date): DateRange {
  return {
    start: startOfWeek(date, { weekStartsOn: 1, locale: es }),
    end: endOfWeek(date, { weekStartsOn: 1, locale: es }),
  };
}

export function getMonthRange(date: Date): DateRange {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function formatDateEs(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: es });
}

// --- Helpers basados en strings ISO (yyyy-MM-dd), zona horaria AR ---

export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date(),
  );
}

export function weekStartIso(dateIso: string): string {
  return format(
    startOfWeek(parseISO(dateIso), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
}

export function addDaysIso(dateIso: string, days: number): string {
  return format(addDays(parseISO(dateIso), days), "yyyy-MM-dd");
}

/** Lunes a viernes de la semana que empieza en weekStart. */
export function weekDaysIso(weekStart: string): string[] {
  return Array.from({ length: 5 }, (_, i) => addDaysIso(weekStart, i));
}

/** Lunes (inicio de semana) cuyo día cae dentro del mes dado. */
export function mondaysOfMonth(year: number, month: number): string[] {
  const mondays: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 1) {
      mondays.push(format(date, "yyyy-MM-dd"));
    }
  }

  return mondays;
}

/** Convierte un ISO date string a Date UTC midnight (para columnas @db.Date). */
export function isoToDb(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00.000Z`);
}

/** Convierte un Date de Prisma (@db.Date) a ISO string. */
export function dbToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatIsoShort(dateIso: string): string {
  return format(parseISO(dateIso), "EEE d/M", { locale: es });
}

export function formatIsoLong(dateIso: string): string {
  return format(parseISO(dateIso), "d 'de' MMMM yyyy", { locale: es });
}

export function monthNameEs(month: number): string {
  return format(new Date(2026, month - 1, 1), "MMMM", { locale: es });
}

export function parseIsoParts(dateIso: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = dateIso.split("-").map(Number);
  return { year, month, day };
}
