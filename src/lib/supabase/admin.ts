import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase com Service Role.
 *
 * ATENÇÃO - DIRETRIZ MASTER_PLAN (Seções 5 e 33):
 * 1. NUNCA utilize este cliente em páginas, layouts ou componentes clientes ("use client").
 * 2. Permitido exclusivamente em jobs, workers, feed importers, webhooks seguros e rotas internas protegidas.
 * 3. Nunca crie variável com prefixo NEXT_PUBLIC_ para a chave de serviço.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "VIOLAÇÃO DE SEGURANÇA: createAdminClient() não pode ser executado no navegador!"
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configuração do Supabase Admin ausente. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
