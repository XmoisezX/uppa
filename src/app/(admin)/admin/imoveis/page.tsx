import { getAdminProperties } from '@/features/admin/services/properties';
import { PropertiesClient } from './PropertiesClient';

export const dynamic = 'force-dynamic';

export default async function AdminPropertiesPage() {
  const { data: properties, total } = await getAdminProperties({ pageSize: 50 });
  return <PropertiesClient initialProperties={properties} total={total} />;
}
