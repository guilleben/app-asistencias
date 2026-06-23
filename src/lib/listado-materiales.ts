import { dbToIso } from "@/lib/dates";

export type MaterialListPdfData = {
  owner: string;
  workName: string;
  location: string;
  date: Date;
  items: { description: string; quantity: string }[];
};

export function buildMaterialListPdfFilename(list: {
  date: Date;
  owner: string;
  workName: string;
}): string {
  const month = String(list.date.getUTCMonth() + 1).padStart(2, "0");
  const year = list.date.getUTCFullYear();
  const owner = list.owner.trim().toUpperCase();
  const work = list.workName.trim();
  return `${month}-${year} Listado Materiales ${owner} ${work} BENASULIN.pdf`;
}

export function formatMaterialListDateForPdf(date: Date): string {
  const iso = dbToIso(date);
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
