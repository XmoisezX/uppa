import { redirect } from 'next/navigation';
import { getCurrentAdminUser } from '@/features/admin/services/auth';
import { AdminProfileView } from '@/features/admin/components/AdminProfileView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Meu Perfil | UPPA Administração',
  description: 'Gerenciamento do perfil de administrador e credenciais de acesso',
};

export default async function AdminProfilePage() {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    redirect('/entrar?redirectTo=/admin/perfil');
  }

  return <AdminProfileView adminUser={adminUser} />;
}
