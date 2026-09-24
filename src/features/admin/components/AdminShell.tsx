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
    <div className="min-h-screen bg-[#f8f9fb] text-slate-900 flex flex-col font-sans">
      <AdminSidebar
        adminUser={adminUser}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-[260px] flex flex-col flex-1 min-w-0">
        <AdminHeader
          adminUser={adminUser}
          onMobileOpen={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-5 sm:p-7 md:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
