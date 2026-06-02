export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// Retorna a data atual no fuso horário de São Paulo (Brasil) no formato YYYY-MM-DD
export const todayISO = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

export const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export const statusColor: Record<string, string> = {
  pendente: "bg-warning text-white",
  pago: "bg-success text-success-foreground",
  atrasado: "bg-destructive text-destructive-foreground",
  cancelado: "bg-muted text-muted-foreground",
};

export const tipoLabel: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  transferencia: "Transferência",
};
