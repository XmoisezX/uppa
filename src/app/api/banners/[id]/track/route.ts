import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/banners/[id]/track?type=impression|click
 *
 * Registra impressão ou clique de um banner de forma atômica.
 * - Usa service_role exclusivamente no servidor (jamais exposto ao frontend).
 * - Retorna 204 rapidamente para não impactar UX.
 * - Falhas silenciosas para não afetar o usuário.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const type = req.nextUrl.searchParams.get('type');

    if (!id || (type !== 'impression' && type !== 'click')) {
      return new NextResponse(null, { status: 400 });
    }

    const supabase = createAdminClient();

    // Incremento atômico via RPC server-side — sem race condition
    await supabase.rpc('increment_banner_counter', {
      banner_id: id,
      counter_field: type === 'impression' ? 'impressions' : 'clicks',
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    // Falha silenciosa — tracking nunca deve impactar o usuário
    return new NextResponse(null, { status: 204 });
  }
}
