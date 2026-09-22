import React from "react";
import { PortalShell } from "@/components/layout/PortalShell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell>{children}</PortalShell>;
}
