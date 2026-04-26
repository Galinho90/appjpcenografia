import { Clock, CheckCircle2, AlertCircle, XCircle, type LucideIcon } from "lucide-react";

export type StatusKey =
  | "pendente"
  | "aprovada"
  | "rejeitada"
  | "pago"
  | "erro"
  | "enviada"
  | "nao_enviada";

export interface StatusBadgeConfig {
  label: string;
  icon: LucideIcon;
  /** className padronizada usando tokens do design system */
  className: string;
}

// Padrão visual unificado para todo o sistema:
// - Pendente / aguardando  -> warning (amarelo/laranja)
// - Aprovada / pago / sucesso -> success (verde)
// - Rejeitada / erro -> destructive (vermelho)
// Usamos tokens HSL definidos em src/index.css
const PENDING_CLS =
  "border-transparent bg-[hsl(var(--warning))] text-white hover:bg-[hsl(var(--warning))]";
const SUCCESS_CLS =
  "border-transparent bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]";
const DESTRUCTIVE_CLS =
  "border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]";

export const statusBadgeMap: Record<StatusKey, StatusBadgeConfig> = {
  pendente:    { label: "Pendente",    icon: Clock,        className: PENDING_CLS },
  aprovada:    { label: "Aprovada",    icon: CheckCircle2, className: SUCCESS_CLS },
  rejeitada:   { label: "Rejeitada",   icon: AlertCircle,  className: DESTRUCTIVE_CLS },
  pago:        { label: "Pago",        icon: CheckCircle2, className: SUCCESS_CLS },
  erro:        { label: "Erro",        icon: AlertCircle,  className: DESTRUCTIVE_CLS },
  enviada:     { label: "Enviada",     icon: CheckCircle2, className: SUCCESS_CLS },
  nao_enviada: { label: "Não enviada", icon: XCircle,      className: PENDING_CLS },
};

export function getStatusBadge(status: string | null | undefined): StatusBadgeConfig {
  const key = (status ?? "pendente") as StatusKey;
  return statusBadgeMap[key] ?? statusBadgeMap.pendente;
}
