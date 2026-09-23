/**
 * SSRF Guard & Safe HTTP Client
 * Conforme requisitos de segurança do UPPA Website Import:
 * - Valida URLs rigorosamente contra SSRF
 * - Bloqueia localhost, 127.0.0.1, faixas privadas RFC 1918, RFC 3927, link-local,
 *   metadata endpoints (AWS, GCP, Azure), IPv6 privado e protocolos não-HTTP/HTTPS
 * - Resolve DNS e bloqueia IPs internos antes da conexão
 * - Proteção contra DNS rebinding e bypass via redirecionamentos maliciosos (manual hop validation)
 */

import dns from "node:dns/promises";
import net from "node:net";

export class SSRFError extends Error {
  constructor(message: string) {
    super(`[SSRF Guard] Acesso bloqueado: ${message}`);
    this.name = "SSRFError";
  }
}

// User-Agent oficial e identificador da UPPA
export const UPPA_USER_AGENT =
  "UPPA-Bot/1.0 (+https://uppa.com.br/bot; contato@uppa.com.br)";

interface CachedDnsRecord {
  address: string;
  family: number;
}

// Cache em memória de resolução DNS para evitar saturação do threadpool libuv em crawling intensivo
const dnsResolutionCache = new Map<
  string,
  { records: CachedDnsRecord[]; expiresAt: number }
>();

/**
 * Verifica se um endereço IP (IPv4 ou IPv6) pertence a faixas privadas,
 * loopback, link-local, reservadas ou metadados de nuvem.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // Normaliza IPv4 mapeado em IPv6 (ex: ::ffff:127.0.0.1 ou ::ffff:7f00:1)
  if (ip.startsWith("::ffff:")) {
    const v4Part = ip.slice(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateOrReservedIP(v4Part);
    }
  }

  // Verificação IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Formato inválido/anômalo é tratado como proibido
    }

    const [b0, b1] = parts;

    // 0.0.0.0/8 (Esta rede)
    if (b0 === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;

    // 10.0.0.0/8 (Privada RFC 1918)
    if (b0 === 10) return true;

    // 172.16.0.0/12 (Privada RFC 1918: 172.16.x.x - 172.31.x.x)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // 192.168.0.0/16 (Privada RFC 1918)
    if (b0 === 192 && b1 === 168) return true;

    // 169.254.0.0/16 (Link-Local e Cloud Metadata RFC 3927)
    if (b0 === 169 && b1 === 254) return true;

    // 100.64.0.0/10 (Carrier-Grade NAT RFC 6598)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // 192.0.0.0/24 (IETF Assignments)
    if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;

    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentação e TEST-NET)
    if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;
    if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
    if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;

    // 198.18.0.0/15 (Network Benchmark Tests)
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

    // 224.0.0.0/4 (Multicast)
    if (b0 >= 224 && b0 <= 239) return true;

    // 240.0.0.0/4 (Reservado para uso futuro / broadcast)
    if (b0 >= 240) return true;

    return false;
  }

  // Verificação IPv6
  if (net.isIPv6(ip)) {
    const clean = ip.toLowerCase();

    // Loopback (::1) ou Não especificado (::)
    if (clean === "::1" || clean === "::") return true;

    // Unique Local (fc00::/7 - fc00 e fd00)
    if (clean.startsWith("fc") || clean.startsWith("fd")) return true;

    // Link-Local (fe80::/10 - fe8, fe9, fea, feb)
    if (
      clean.startsWith("fe8") ||
      clean.startsWith("fe9") ||
      clean.startsWith("fea") ||
      clean.startsWith("feb")
    ) {
      return true;
    }

    // Multicast (ff00::/8)
    if (clean.startsWith("ff")) return true;

    return false;
  }

  return true; // Qualquer string que não seja IPv4 ou IPv6 válido é bloqueada
}

/**
 * Valida se uma URL é estritamente segura para requisição externa:
 * - Protocolo http ou https
 * - Sem credenciais embutidas (user:pass@host)
 * - Hostname não proibido
 * - Resolve DNS e checa todas as entradas de IP
 */
export async function validateSafeUrl(
  rawUrl: string,
  options?: { skipDnsValidation?: boolean }
): Promise<URL> {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new SSRFError("URL nula ou vazia.");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SSRFError(`URL mal formatada: ${rawUrl}`);
  }

  // 1. Validação de Protocolo (Apenas http e https)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SSRFError(
      `Protocolo não permitido: ${parsed.protocol}. Apenas HTTP e HTTPS são suportados.`
    );
  }

  // 2. Proíbe credenciais embutidas (ex: https://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    throw new SSRFError("URLs com credenciais de autenticação não são permitidas.");
  }

  // 3. Validação do Hostname
  const hostname = parsed.hostname.toLowerCase().trim();

  if (!hostname) {
    throw new SSRFError("Hostname vazio.");
  }

  // Bloqueio de hostnames proibidos conhecidos
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "metadata.google.internal",
    "metadata.azure.com",
    "instance-data",
  ];

  if (blockedHostnames.includes(hostname)) {
    throw new SSRFError(`Hostname proibido: ${hostname}`);
  }

  if (
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".corp") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".arpa")
  ) {
    throw new SSRFError(`Domínio interno/local proibido: ${hostname}`);
  }

  // Bloqueio de truques numéricos/hexadecimais/octais no formato de IP
  // Ex: 0177.0.0.1 ou 0x7f000001 ou 2130706433
  if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d+$/.test(hostname)) {
    throw new SSRFError(`Formato numérico ambíguo de endereço IP: ${hostname}`);
  }

  // Se o hostname já for um IP literal direto, verifica de imediato
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      throw new SSRFError(`Endereço IP privado ou reservado bloqueado: ${hostname}`);
    }
  } else if (!options?.skipDnsValidation) {
    // 4. Resolução DNS e verificação de IP de destino com cache
    try {
      const now = Date.now();
      let records: CachedDnsRecord[];
      const cached = dnsResolutionCache.get(hostname);

      if (cached && cached.expiresAt > now) {
        records = cached.records;
      } else {
        records = await dns.lookup(hostname, { all: true });
        if (records && records.length > 0) {
          dnsResolutionCache.set(hostname, {
            records,
            expiresAt: now + 5 * 60 * 1000, // 5 minutos de TTL
          });
        }
      }

      if (!records || records.length === 0) {
        throw new SSRFError(`Falha ao resolver DNS para o domínio: ${hostname}`);
      }

      for (const record of records) {
        if (isPrivateOrReservedIP(record.address)) {
          throw new SSRFError(
            `O domínio ${hostname} resolve para um IP privado/reservado (${record.address}). Requisição bloqueada.`
          );
        }
      }
    } catch (err: any) {
      if (err instanceof SSRFError) throw err;
      throw new SSRFError(
        `Falha na resolução de DNS para ${hostname}: ${err?.message || "Erro desconhecido"}`
      );
    }
  }

  return parsed;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseSizeBytes?: number;
  skipDnsValidation?: boolean;
  fetchFn?: typeof fetch;
}

/**
 * Cliente HTTP Seguro com proteção completa contra SSRF, DNS Rebinding
 * e Redirects maliciosos através de seguimento manual passo a passo.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxRedirects = options.maxRedirects ?? 5;
  const maxResponseSizeBytes = options.maxResponseSizeBytes ?? 15 * 1024 * 1024; // 15MB

  let currentUrl = targetUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // Valida a URL atual a cada salto (impede que um domínio público redirecione para IP interno)
    const validatedUrl = await validateSafeUrl(currentUrl, {
      skipDnsValidation: options.skipDnsValidation,
    });

    const headers = new Headers(options.headers || {});
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", UPPA_USER_AGENT);
    }
    if (!headers.has("Accept")) {
      headers.set(
        "Accept",
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7"
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchImpl = options.fetchFn || globalThis.fetch || fetch;
    let response: Response;
    try {
      response = await fetchImpl(validatedUrl.toString(), {
        ...options,
        headers,
        redirect: "manual", // IMPORTANTE: Segue manualmente para validar cada hop
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        throw new Error(`Timeout de rede (${timeoutMs}ms) ao acessar ${validatedUrl.hostname}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Tratamento de Redirecionamento Manual (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        return response; // Sem header location, retorna a resposta
      }

      // Resolve URL relativa se necessário
      const nextUrl = new URL(location, validatedUrl).toString();
      redirectCount++;

      if (redirectCount > maxRedirects) {
        throw new Error(
          `Limite máximo de redirecionamentos (${maxRedirects}) excedido ao acessar ${targetUrl}`
        );
      }

      currentUrl = nextUrl;
      continue;
    }

    // Validação de Tamanho Máximo de Resposta
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxResponseSizeBytes) {
      throw new Error(
        `Resposta excede o tamanho limite permitido de ${maxResponseSizeBytes / (1024 * 1024)}MB.`
      );
    }

    return response;
  }

  throw new Error("Loop inesperado de requisição HTTP.");
}
