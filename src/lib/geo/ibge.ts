import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Interface do payload retornado pela API oficial do IBGE
 */
export interface IbgeCityResponse {
  id: number;
  nome: string;
  microrregiao?: {
    id: number;
    nome: string;
    mesorregiao?: {
      id: number;
      nome: string;
      UF?: {
        id: number;
        sigla: string;
        nome: string;
      };
    };
  };
}

/**
 * Converte qualquer texto para slug amigável em conformidade com URLs e MASTER_PLAN
 * Exemplo: "São Paulo" -> "sao-paulo", "Pelotas" -> "pelotas"
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentuação
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove caracteres não alfanuméricos
    .replace(/\s+/g, "-") // substitui espaços por traços
    .replace(/-+/g, "-"); // remove traços duplicados
}

/**
 * Consulta a API oficial do IBGE para obter todos os municípios de uma determinada UF
 */
export async function fetchIbgeCitiesByState(uf: string): Promise<IbgeCityResponse[]> {
  const normalizedUf = uf.toUpperCase().trim();
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalizedUf}/municipios`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao consultar API do IBGE para o estado ${normalizedUf}: HTTP ${response.status}`
    );
  }

  return response.json();
}

/**
 * Importa e sincroniza municípios de uma UF no banco de dados Supabase
 * Execução idempotente (atualiza se já existir)
 */
export async function importCitiesForState(uf: string) {
  const adminClient = createAdminClient();
  const normalizedUf = uf.toUpperCase().trim();

  // 1. Busca o estado no banco de dados para obter o UUID correspondente
  const { data: stateData, error: stateError } = await adminClient
    .from("states")
    .select("id, name, code")
    .eq("code", normalizedUf)
    .single();

  if (stateError || !stateData) {
    throw new Error(
      `Estado com UF '${normalizedUf}' não encontrado no banco de dados. Execute o seed dos estados primeiro.`
    );
  }

  // 2. Consulta a API do IBGE
  const ibgeCities = await fetchIbgeCitiesByState(normalizedUf);

  if (!ibgeCities || ibgeCities.length === 0) {
    return {
      state: normalizedUf,
      imported: 0,
      message: "Nenhum município retornado pelo IBGE.",
    };
  }

  // 3. Prepara os registros para upsert
  const records = ibgeCities.map((city) => ({
    state_id: stateData.id,
    name: city.nome.trim(),
    ibge_code: city.id,
    slug: generateSlug(city.nome),
    updated_at: new Date().toISOString(),
  }));

  // 4. Executa upsert em lote
  const { data, error } = await adminClient
    .from("cities")
    .upsert(records, {
      onConflict: "state_id,slug",
      ignoreDuplicates: false,
    })
    .select("id, name, slug, ibge_code");

  if (error) {
    throw new Error(`Erro ao persistir municípios no banco de dados: ${error.message}`);
  }

  return {
    state: normalizedUf,
    totalFound: ibgeCities.length,
    imported: data?.length || records.length,
  };
}
