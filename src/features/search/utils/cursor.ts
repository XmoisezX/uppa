/**
 * Funções seguras de codificação, decodificação e validação de cursor (Keyset Pagination)
 * Previne SQL injection e assegura desempate determinístico em buscas infinitas
 */

export interface DecodedCursor {
  sortVal: number | string | null;
  id: string;
  order: string;
}

export function encodeCursor(cursor: DecodedCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, "utf-8").toString("base64url");
}

export function decodeCursor(raw?: string | null): DecodedCursor | null {
  if (!raw || typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const json = Buffer.from(raw.trim(), "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return {
      sortVal: parsed.sortVal !== undefined ? parsed.sortVal : null,
      id: String(parsed.id),
      order: String(parsed.order || "recent"),
    };
  } catch {
    return null;
  }
}
