'use client';

import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import type { AdminUser } from '@/types/admin';

interface AdminShellProps {
  adminUser: AdminUser;
  children: React.ReactNode;
}

export function AdminShell({ adminUser, children }: AdminShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AdminSidebar
        adminUser={adminUser}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <AdminHeader
          adminUser={adminUser}
          onMobileOpen={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
