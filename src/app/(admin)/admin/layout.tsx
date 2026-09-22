import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminUser } from '@/features/admin/services/auth';
import { AdminShell } from '@/features/admin/components/AdminShell';
import { AdminAccessDenied } from '@/features/admin/components/AdminAccessDenied';

export const metadata = {
  title: 'UPPA — Administração do Portal',
  description: 'Painel administrativo central e CMS da UPPA',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar?redirectTo=/admin');
  }

  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    return <AdminAccessDenied userEmail={user.email} />;
  }

  return <AdminShell adminUser={adminUser}>{children}</AdminShell>;
}
