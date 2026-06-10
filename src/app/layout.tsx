import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Benasulin App";

export const metadata: Metadata = {
  title: appName,
  description: "Sistema de asistencias de empleados",
  applicationName: appName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfbfd",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body
        className="flex h-dvh flex-col overflow-hidden bg-background"
        suppressHydrationWarning
      >
        {process.env.NODE_ENV === "development" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){if("serviceWorker"in navigator){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}if("caches"in window){caches.keys().then(function(k){k.forEach(function(n){if(n.includes("serwist")||n.includes("precache"))caches.delete(n)})})}})();`,
            }}
          />
        ) : null}
        <AppHeader title={appName} />
        <main className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto overscroll-y-contain px-5 pt-6 pb-6">
          {children}
        </main>
        <BottomNav />
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "rounded-2xl border border-border/80 bg-card shadow-apple-md font-sans",
              title: "text-[15px] font-semibold tracking-tight",
              description: "text-[13px] text-muted-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
