import React from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface PortalShellProps {
  children: React.ReactNode;
}

/**
 * PortalShell - Casca global oficial das rotas públicas da UPPA.
 * Garante Header, Footer e área principal de conteúdo consistentes em todo o portal.
 */
export function PortalShell({ children }: PortalShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 selection:bg-indigo-600 selection:text-white dark:bg-slate-950 dark:text-slate-100 font-sans">
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
