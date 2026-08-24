import { CheckCircle2, AlertTriangle, MinusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getEstadoConciliacao, type EstadoConciliacao } from "@/lib/conciliacao";
import type { MovimentacaoFinanceira } from "@/hooks/useFinanceiro";

export interface ConciliacaoBadgeProps {
  mov: Pick<MovimentacaoFinanceira, "status"> & { fitid?: string | null };
  /** Oculta a badge quando não há conciliação aplicável (lançamento previsto). */
  hideWhenNotApplicable?: boolean;
  className?: string;
}

const CONFIG: Record<EstadoConciliacao, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  conciliada: {
    label: "Conciliado",
    icon: CheckCircle2,
    cls: "bg-[hsl(var(--success))]/12 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/12",
  },
  nao_conciliada: {
    label: "Não conciliado",
    icon: AlertTriangle,
    cls: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/15",
  },
  nao_aplicavel: {
    label: "Sem extrato",
    icon: MinusCircle,
    cls: "bg-muted text-muted-foreground hover:bg-muted",
  },
};

/** Badge de conciliação bancária — padrão visual unificado do sistema. */
export function ConciliacaoBadge({ mov, hideWhenNotApplicable, className }: ConciliacaoBadgeProps) {
  const estado = getEstadoConciliacao(mov);
  if (estado === "nao_aplicavel" && hideWhenNotApplicable) return null;

  const { label, icon: Icon, cls } = CONFIG[estado];
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 whitespace-nowrap border-transparent px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider",
        cls,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export default ConciliacaoBadge;
