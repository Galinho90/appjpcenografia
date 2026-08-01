import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface QuinzenaSelectorProps {
  /** Data inicial da quinzena exibida. */
  inicio: Date;
  /** Data final da quinzena exibida. */
  fim: Date;
  /** Navega para a quinzena anterior/próxima. */
  onShift: (dir: -1 | 1) => void;
  /** Volta para a quinzena vigente (exibe o botão apenas quando informado e fora da atual). */
  onToday?: () => void;
  /** Indica se a quinzena exibida é a atual. */
  isCurrent?: boolean;
  /** Rótulo acima das datas. */
  label?: string;
  /** Conteúdo adicional abaixo (ex.: ações de exportação). */
  footer?: React.ReactNode;
  className?: string;
}

const fmt = (d: Date) => d.toLocaleDateString("pt-BR");

/**
 * Seletor de quinzena padronizado — mesma linguagem visual da página /meu-extrato
 * (superfície de vidro, sombra premium, conteúdo centralizado com respiro).
 */
export function QuinzenaSelector({
  inicio,
  fim,
  onShift,
  onToday,
  isCurrent = true,
  label = "Quinzena Selecionada",
  footer,
  className,
}: QuinzenaSelectorProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex min-h-[84px] items-center justify-between gap-2 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full hover:bg-primary/10"
            onClick={() => onShift(-1)}
            aria-label="Quinzena anterior"
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="text-xs font-bold leading-tight text-foreground sm:text-sm">
              {fmt(inicio)} — {fmt(fim)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full hover:bg-primary/10"
            onClick={() => onShift(1)}
            aria-label="Próxima quinzena"
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </Button>
        </div>
        {onToday && !isCurrent ? (
          <div className="px-4 pb-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full text-xs font-bold uppercase tracking-wider"
              onClick={onToday}
            >
              Voltar para Hoje
            </Button>
          </div>
        ) : null}
        {footer ? <div className="px-4 pb-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
