import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Status de conciliação entre um fechamento (valor esperado) e a movimentação
 * financeira correspondente (valor bancário / OFX).
 */
export type ConciliacaoStatus =
  | "ok"
  | "divergente"
  | "nao_conciliado"
  | "sem_movimentacao"
  | "nao_pago";

export type ConciliacaoItem = {
  fechamento_id: string;
  colaborador_id: string;
  colaborador_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  fechamento_status: string;
  /** Valor esperado = valor final do fechamento. */
  valor_esperado: number;
  /** Valor efetivamente registrado na movimentação financeira (banco). */
  valor_banco: number | null;
  diferenca: number;
  /** true quando a movimentação foi vinculada a uma transação do OFX (fitid). */
  conciliado_ofx: boolean;
  movimentacao_id: string | null;
  data_pagamento: string | null;
  status: ConciliacaoStatus;
};

export type ConciliacaoFilters = {
  dataInicio?: string;
  dataFim?: string;
  colaboradorId?: string;
  status?: string;
};

export const CONCILIACAO_STATUS_LABEL: Record<ConciliacaoStatus, string> = {
  ok: "Conciliado",
  divergente: "Valor divergente",
  nao_conciliado: "Sem vínculo OFX",
  sem_movimentacao: "Sem movimentação",
  nao_pago: "Fechamento pendente",
};

export const CONCILIACAO_STATUS_VARIANT: Record<ConciliacaoStatus, string> = {
  ok: "bg-secondary/15 text-secondary border-secondary/30",
  divergente: "bg-destructive/15 text-destructive border-destructive/30",
  nao_conciliado: "bg-accent/15 text-accent border-accent/30",
  sem_movimentacao: "bg-destructive/15 text-destructive border-destructive/30",
  nao_pago: "bg-muted text-muted-foreground border-border",
};

/** Tolerância monetária (centavos de arredondamento do banco). */
const TOLERANCIA = 0.01;

export function useConciliacaoFechamentos(filters: ConciliacaoFilters = {}) {
  return useQuery({
    queryKey: ["conciliacao_fechamentos", filters],
    queryFn: async (): Promise<ConciliacaoItem[]> => {
      let fq = supabase
        .from("fechamentos")
        .select(
          "id, colaborador_id, periodo_inicio, periodo_fim, valor_final, status, data_pagamento, colaboradores(nome)"
        )
        .order("periodo_fim", { ascending: false })
        .limit(1000);

      if (filters.dataInicio) fq = fq.gte("periodo_fim", filters.dataInicio);
      if (filters.dataFim) fq = fq.lte("periodo_fim", filters.dataFim);
      if (filters.colaboradorId && filters.colaboradorId !== "all") {
        fq = fq.eq("colaborador_id", filters.colaboradorId);
      }

      const { data: fechamentos, error } = await fq;
      if (error) throw error;

      const ids = (fechamentos ?? []).map((f) => f.id);
      let movs: any[] = [];
      if (ids.length > 0) {
        const { data: movsData, error: movErr } = await supabase
          .from("movimentacoes_financeiras")
          .select("id, fechamento_id, valor, fitid, status, data_pagamento, data_vencimento")
          .in("fechamento_id", ids);
        if (movErr) throw movErr;
        movs = movsData ?? [];
      }

      const movPorFechamento = new Map<string, any>();
      for (const m of movs) {
        if (m.fechamento_id) movPorFechamento.set(m.fechamento_id, m);
      }

      const itens: ConciliacaoItem[] = (fechamentos ?? []).map((f: any) => {
        const mov = movPorFechamento.get(f.id) ?? null;
        const esperado = Number(f.valor_final) || 0;
        const banco = mov ? Number(mov.valor) || 0 : null;
        const conciliadoOfx = Boolean(mov?.fitid);
        const diferenca = banco === null ? -esperado : banco - esperado;

        let status: ConciliacaoStatus;
        if (f.status !== "pago") {
          status = "nao_pago";
        } else if (!mov) {
          status = "sem_movimentacao";
        } else if (Math.abs(diferenca) > TOLERANCIA) {
          status = "divergente";
        } else if (!conciliadoOfx) {
          status = "nao_conciliado";
        } else {
          status = "ok";
        }

        return {
          fechamento_id: f.id,
          colaborador_id: f.colaborador_id,
          colaborador_nome: f.colaboradores?.nome ?? "—",
          periodo_inicio: f.periodo_inicio,
          periodo_fim: f.periodo_fim,
          fechamento_status: f.status,
          valor_esperado: esperado,
          valor_banco: banco,
          diferenca,
          conciliado_ofx: conciliadoOfx,
          movimentacao_id: mov?.id ?? null,
          data_pagamento:
            mov?.data_pagamento ?? f.data_pagamento ?? mov?.data_vencimento ?? null,
          status,
        };
      });

      if (filters.status && filters.status !== "all") {
        return itens.filter((i) => i.status === filters.status);
      }
      return itens;
    },
  });
}
