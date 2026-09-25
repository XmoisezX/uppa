"use client";

import React, { createContext, useContext } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

const PortalShellContext = createContext<boolean>(false);

interface PortalShellProps {
  children: React.ReactNode;
}

/**
 * PortalShell - Casca global oficial das rotas públicas da UPPA.
 * Garante Header, Footer e área principal de conteúdo consistentes em todo o portal.
 * Evita duplicação caso seja aninhado (ex.: em páginas 404/not-found disparadas em rotas públicas).
 */
export function PortalShell({ children }: PortalShellProps) {
  const isNested = useContext(PortalShellContext);

  if (isNested) {
    return <>{children}</>;
  }

  return (
    <PortalShellContext.Provider value={true}>
      <div className="flex min-h-screen flex-col bg-white text-slate-900 selection:bg-indigo-600 selection:text-white dark:bg-slate-950 dark:text-slate-100 font-sans">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </div>
    </PortalShellContext.Provider>
  );
}
