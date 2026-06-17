import { buildBudgetPdfFilename } from "@/lib/presupuestos";

export type BudgetPdfMeta = {
  id: number;
  date: string;
  owner: string;
  workName: string;
};

function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

function isoToUtcDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function buildFilename(meta: BudgetPdfMeta): string {
  return buildBudgetPdfFilename({
    date: isoToUtcDate(meta.date),
    owner: meta.owner,
    workName: meta.workName,
  });
}

function triggerBlobDownload(blob: Blob, filename: string): boolean {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

function openBlobInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function sharePdfFile(file: File): Promise<boolean> {
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
    return false;
  }

  try {
    await navigator.share({ files: [file], title: file.name });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }
    throw error;
  }
}

export type DownloadBudgetPdfResult =
  | { ok: true; method: "share" | "download" | "open" }
  | { ok: false; message: string };

export async function downloadOrShareBudgetPdf(
  meta: BudgetPdfMeta,
): Promise<DownloadBudgetPdfResult> {
  let response: Response;

  try {
    response = await fetch(`/api/presupuestos/${meta.id}/pdf`);
  } catch {
    return { ok: false, message: "No se pudo conectar. Revisá tu conexión." };
  }

  if (!response.ok) {
    if (response.status === 404) {
      return { ok: false, message: "Presupuesto no encontrado" };
    }
    return { ok: false, message: "No se pudo generar el PDF" };
  }

  const blob = await response.blob();
  const filename =
    parseFilenameFromDisposition(response.headers.get("Content-Disposition")) ??
    buildFilename(meta);
  const file = new File([blob], filename, { type: "application/pdf" });

  try {
    if (await sharePdfFile(file)) {
      return { ok: true, method: "share" };
    }
  } catch {
    // Fall through to blob download if share fails unexpectedly.
  }

  try {
    triggerBlobDownload(blob, filename);
    return { ok: true, method: "download" };
  } catch {
    openBlobInNewTab(blob);
    return { ok: true, method: "open" };
  }
}
