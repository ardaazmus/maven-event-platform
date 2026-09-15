import type { Metadata } from "next";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

// Self-hosted fallback — no Google Fonts network at build (M00.2)
// CSS variables preserved: --font-geist-sans / --font-geist-mono resolved in globals.css
const inter = { variable: "--font-geist-sans" } as const;
const jetbrainsMono = { variable: "--font-geist-mono" } as const;

export const metadata: Metadata = {
  title: "MavenForms — Modern Form Platform",
  description:
    "MavenForms ile profesyonel formlar oluşturun, yayınlayın, yanıtları toplayın ve otomatikleştirin. KVKK uyumlu, mobil öncelikli, çok kiracılı form platformu.",
  keywords: [
    "MavenForms",
    "form builder",
    "form platform",
    "KVKK",
    "online form",
    "veri toplama",
  ],
  authors: [{ name: "MavenForms" }],
  openGraph: {
    title: "MavenForms — Modern Form Platform",
    description:
      "Profesyonel formlar oluşturun, yayınlayın, yanıtları toplayın ve otomatikleştirin.",
    siteName: "MavenForms",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
