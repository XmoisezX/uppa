import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  authors: [{ name: "UPPA Portal Imobiliário" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-slate-900 selection:bg-indigo-600 selection:text-white dark:bg-slate-950 dark:text-slate-100 font-sans">
        <Providers>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
