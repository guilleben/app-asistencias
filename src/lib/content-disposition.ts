/**
 * Builds an `attachment` Content-Disposition header that is safe for any
 * filename. HTTP headers only accept Latin-1, so characters like “ ” or –
 * (common with iOS smart punctuation) would make the response throw.
 * `filename` gets an ASCII fallback; `filename*` carries the full UTF-8 name.
 */
export function attachmentDisposition(filename: string): string {
  const asciiFallback = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”«»]/g, "'")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/["\\]/g, "'")
    .replace(/[^\x20-\x7e]/g, "_");

  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
