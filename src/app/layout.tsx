import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { getSiteSettings } from "@/features/admin/services/site";

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl = "/favicon.ico";
  try {
    const settings = await getSiteSettings();
    if (settings?.site_favicon) {
      faviconUrl = settings.site_favicon;
    }
  } catch {
    // fallback padrão
  }

  return {
    title: {
      default: "UPPA | Portal Imobiliário Nacional",
      template: "%s | UPPA",
    },
    description:
      "Encontre casas, apartamentos e terrenos à venda e para alugar no portal imobiliário UPPA. Anúncios diretos com imobiliárias e corretores credenciados em todo o Brasil.",
    keywords: [
      "imóveis",
      "apartamentos",
      "casas à venda",
      "aluguel",
      "imobiliárias",
      "portal imobiliário",
      "UPPA",
    ],
    authors: [{ name: "UPPA" }],
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let faviconUrl = "/favicon.ico";
  try {
    const settings = await getSiteSettings();
    if (settings?.site_favicon) {
      faviconUrl = settings.site_favicon;
    }
  } catch {
    // fallback
  }

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href={faviconUrl} />
      </head>
      <body className="flex min-h-full flex-col bg-white text-slate-900 selection:bg-indigo-600 selection:text-white dark:bg-slate-950 dark:text-slate-100 font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
