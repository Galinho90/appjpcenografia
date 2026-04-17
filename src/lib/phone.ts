// Helpers para tratar celular como identificador de login.
// Convertemos celular -> email interno para usar Supabase Auth padrão.

export const PHONE_EMAIL_DOMAIN = "jpcenografia.local";

/** Mantém apenas dígitos. */
export function onlyDigits(input: string): string {
  return (input || "").replace(/\D/g, "");
}

/**
 * Normaliza para formato E.164 BR: +55DDDNNNNNNNNN
 * Aceita entradas com ou sem máscara, com ou sem +55.
 */
export function normalizePhoneBR(input: string): string {
  const d = onlyDigits(input);
  if (!d) return "";
  // Já vem com 55 (12 ou 13 dígitos)
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) {
    return `+${d}`;
  }
  // 10 ou 11 dígitos (DDD + número) -> prefixar 55
  if (d.length === 10 || d.length === 11) {
    return `+55${d}`;
  }
  // Fallback: devolve com + para tentar mesmo assim
  return `+${d}`;
}

/** Aplica máscara visual (11) 99999-8888 / (11) 9999-8888. */
export function maskPhoneBR(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Converte celular -> email interno usado no Supabase Auth. */
export function phoneToEmail(phone: string): string {
  const e164 = normalizePhoneBR(phone);
  const digits = onlyDigits(e164);
  return `${digits}@${PHONE_EMAIL_DOMAIN}`;
}

/** Validação básica: precisa ter 10 ou 11 dígitos (sem o 55). */
export function isValidPhoneBR(input: string): boolean {
  const d = onlyDigits(input);
  // aceita com ou sem 55
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return true;
  return d.length === 10 || d.length === 11;
}
