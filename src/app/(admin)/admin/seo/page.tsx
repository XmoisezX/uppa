import { getSiteSettings } from "@/features/admin/services/site";
import { getAdminSeoStats } from "@/features/seo/services";
import { SeoClient } from "./SeoClient";

export const dynamic = "force-dynamic";

export default async function AdminSeoPage() {
  const [settings, seoStats] = await Promise.all([
    getSiteSettings(),
    getAdminSeoStats(),
  ]);

  return <SeoClient initialSettings={settings} stats={seoStats} />;
}
