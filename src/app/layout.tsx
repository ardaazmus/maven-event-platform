import type { Metadata } from "next";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

// Self-hosted fallback — no Google Fonts network at build (M00.2)
// CSS variables preserved: --font-geist-sans / --font-geist-mono resolved in globals.css
const inter = { variable: "--font-geist-sans" } as const;
const jetbrainsMono = { variable: "--font-geist-mono" } as const;

export const metadata: Metadata = {
  title: "Maven Event Platform — Etkinlik Yönetimi",
  description:
    "Maven Event Platform ile etkinlikleri yönetin; kayıt, bilet, yaka kartı, yoklama ve salon planını tek çalışma alanında toplayın. Maven Forms & Intake modülüyle KVKK uyumlu, mobil öncelikli formlar.",
  keywords: [
    "Maven Event Platform",
    "Maven Event Management",
    "Maven Forms & Intake",
    "Maven Event Floor",
    "Maven Event Mobile",
    "etkinlik yönetimi",
    "KVKK",
    "online kayıt",
    "veri toplama",
  ],
  authors: [{ name: "Maven Event Platform" }],
  openGraph: {
    title: "Maven Event Platform — Etkinlik Yönetimi",
    description:
      "Etkinlikleri yönetin; kayıt, bilet, yaka kartı, yoklama ve salon planını tek çalışma alanında toplayın.",
    siteName: "Maven Event Platform",
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
