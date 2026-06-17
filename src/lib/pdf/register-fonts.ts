import path from "node:path";

import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  registered = true;

  const fontsDir = path.join(process.cwd(), "src/lib/pdf/fonts");

  Font.register({
    family: "Montserrat",
    fonts: [
      {
        src: path.join(fontsDir, "Montserrat-Bold.woff"),
        fontWeight: 700,
      },
    ],
  });

  Font.register({
    family: "OpenSans",
    fonts: [
      {
        src: path.join(fontsDir, "OpenSans-Regular.woff"),
        fontWeight: 400,
      },
      {
        src: path.join(fontsDir, "OpenSans-Bold.woff"),
        fontWeight: 700,
      },
    ],
  });
}

export function getBenasulinLogoPath() {
  return path.join(process.cwd(), "public/pdf/benasulin-logo.png");
}
