// Máscaras de input para campos brasileiros.

export function onlyDigits(input: string): string {
  return (input || "").replace(/\D/g, "");
}

/** Aplica máscara de CPF: 000.000.000-00 */
export function maskCPF(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Validação básica: precisa ter 11 dígitos. */
export function isValidCPF(input: string): boolean {
  return onlyDigits(input).length === 11;
}
