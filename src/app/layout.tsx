import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

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
