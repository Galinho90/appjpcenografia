import { useMemo, useState } from "react";
import { ShieldCheck, AlertTriangle, ChevronDown, Upload, ScanSearch, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRL, fmtDate } from "@/lib/financeiro";
import { getEstadoConciliacao } from "@/lib/conciliacao";
import { cn } from "@/lib/utils";
import type { MovimentacaoFinanceira } from "@/hooks/useFinanceiro";

export interface PainelConciliacaoProps {
  /** Movimentações já filtradas pelo período/conta em exibição. */
  movs: (MovimentacaoFinanceira & { fitid?: string | null })[];
  /** Saldo de fechamento apurado do dia/período de referência (pode ser nulo). */
  saldoConta: number | null;
  contaLabel: string;
  isLoading?: boolean;
  /** Abre o importador de OFX para resolver as pendências. */
  onImportarOFX?: () => void;
  /** Filtra a lista principal apenas pelos não conciliados. */
  onVerNaoConciliados?: () => void;
}

/**
 * Painel de conciliação bancária.
 *
 * Mostra quanto do caixa exibido ainda não foi casado com o extrato do banco —
 * esse valor é exatamente a diferença potencial entre o saldo do sistema e o
 * saldo real da conta.
 */
export function PainelConciliacao({
  movs,
  saldoConta,
  contaLabel,
  isLoading,
  onImportarOFX,
  onVerNaoConciliados,
}: PainelConciliacaoProps) {
  const [open, setOpen] = useState(false);

  const resumo = useMemo(() => {
    let conciliadas = 0;
    let impacto = 0; // efeito no saldo (entrada positiva, saída negativa)
    const pendentes: (MovimentacaoFinanceira & { fitid?: string | null })[] = [];

    for (const m of movs) {
      const estado = getEstadoConciliacao(m);
      if (estado === "conciliada") { conciliadas++; continue; }
      if (estado !== "nao_conciliada") continue;
      const v = Number(m.valor) || 0;
      impacto += m.tipo === "entrada" ? v : m.tipo === "saida" ? -v : 0;
      pendentes.push(m);
    }

    const efetivadas = conciliadas + pendentes.length;
    const cobertura = efetivadas > 0 ? Math.round((conciliadas / efetivadas) * 100) : 100;
    return { conciliadas, pendentes, impacto, cobertura, efetivadas };
  }, [movs]);

  if (isLoading) return <Skeleton className="h-24 rounded-2xl" />;

  const tudoOk = resumo.pendentes.length === 0;
  const saldoAjustado = saldoConta == null ? null : saldoConta - resumo.impacto;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl shadow-premium-sm",
        tudoOk
          ? "bg-gradient-to-br from-[hsl(var(--success))]/8 to-transparent"
          : "bg-gradient-to-br from-[hsl(var(--warning))]/10 to-transparent",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "rounded-xl p-2 shrink-0",
                tudoOk
                  ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                  : "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
              )}
            >
              {tudoOk ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground">
                {tudoOk ? "Tudo conciliado com o extrato" : `${resumo.pendentes.length} lançamento(s) sem conciliação`}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tudoOk
                  ? `Todos os lançamentos efetivados de ${contaLabel} foram casados com o extrato bancário.`
                  : `Esses lançamentos afetam o caixa mas não existem no extrato de ${contaLabel} — é a diferença entre o saldo do dia e o saldo da conta.`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto lg:shrink-0">
            <Kpi label="Conciliadas" value={String(resumo.conciliadas)} tone="success" />
            <Kpi label="Pendentes" value={String(resumo.pendentes.length)} tone={tudoOk ? "muted" : "warning"} />
            <Kpi label="Impacto no saldo" value={fmtBRL(resumo.impacto)} tone={tudoOk ? "muted" : "destructive"} />
            <Kpi label="Cobertura" value={`${resumo.cobertura}%`} tone={resumo.cobertura === 100 ? "success" : "warning"} />
          </div>
        </div>

        {!tudoOk && (
          <>
            <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Saldo apurado{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {saldoConta == null ? "—" : fmtBRL(saldoConta)}
                </span>
                {saldoAjustado != null && (
                  <>
                    {" · "}Somente conciliado{" "}
                    <span className="font-semibold text-foreground tabular-nums">{fmtBRL(saldoAjustado)}</span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {onVerNaoConciliados && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onVerNaoConciliados}>
                    <ScanSearch className="h-3.5 w-3.5" /> Filtrar pendentes
                  </Button>
                )}
                {onImportarOFX && (
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onImportarOFX}>
                    <Upload className="h-3.5 w-3.5" /> Importar OFX
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                >
                  {open ? "Ocultar lista" : "Ver lista"}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                </Button>
              </div>
            </div>

            {open && (
              <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {resumo.pendentes.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {m.tipo === "entrada" ? (
                        <ArrowDownCircle className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      ) : (
                        <ArrowUpCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{m.descricao}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmtDate(m.data_pagamento ?? m.data_vencimento)} · {m.conta?.apelido ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
                        {m.origem === "ofx" ? "OFX" : m.origem === "fechamento" ? "Fechamento" : "Manual"}
                      </Badge>
                      <span
                        className={cn(
                          "text-xs font-bold tabular-nums whitespace-nowrap",
                          m.tipo === "entrada" ? "text-success" : "text-destructive",
                        )}
                      >
                        {fmtBRL(Number(m.valor) || 0)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "destructive" | "muted" }) {
  const cls =
    tone === "success"
      ? "text-[hsl(var(--success))]"
      : tone === "warning"
        ? "text-[hsl(var(--warning))]"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-2 min-w-0">
      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 truncate whitespace-nowrap text-sm font-bold tabular-nums", cls)}>{value}</p>
    </div>
  );
}

export default PainelConciliacao;
