import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Campos monitorados pela trilha de auditoria. */
export type AuditoriaAjuste = {
  id: string;
  tabela: string;
  registro_id: string;
  campo: string;
  valor_anterior: number | null;
  valor_novo: number | null;
  motivo: string | null;
  descricao_registro: string | null;
  user_id: string | null;
  created_at: string;
};

export type AuditoriaFilters = {
  tabela?: string;
  registroId?: string;
  dataInicio?: string;
  dataFim?: string;
};

const TABELA_LABEL: Record<string, string> = {
  fechamentos: "Fechamento",
  movimentacoes_financeiras: "Movimentação financeira",
};

const CAMPO_LABEL: Record<string, string> = {
  valor: "Valor",
  valor_final: "Valor final",
  total_diarias: "Total de diárias",
  total_vales: "Total de vales",
  total_reembolsos: "Total de reembolsos",
};

export const labelTabela = (t: string) => TABELA_LABEL[t] ?? t;
export const labelCampo = (c: string) => CAMPO_LABEL[c] ?? c;

/** Lista os ajustes manuais de valores (somente admin/gerente por RLS). */
export function useAuditoriaAjustes(filters: AuditoriaFilters = {}) {
  return useQuery({
    queryKey: ["auditoria_ajustes", filters],
    queryFn: async (): Promise<AuditoriaAjuste[]> => {
      let q = supabase
        .from("auditoria_ajustes" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.tabela && filters.tabela !== "all") q = q.eq("tabela", filters.tabela);
      if (filters.registroId) q = q.eq("registro_id", filters.registroId);
      if (filters.dataInicio) q = q.gte("created_at", `${filters.dataInicio}T00:00:00`);
      if (filters.dataFim) q = q.lte("created_at", `${filters.dataFim}T23:59:59`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AuditoriaAjuste[];
    },
  });
}

/**
 * Anexa o motivo informado pelo usuário aos registros de auditoria criados
 * automaticamente nos últimos minutos para aquele registro.
 */
export function useRegistrarMotivoAjuste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tabela, registroId, motivo }: { tabela: string; registroId: string; motivo: string }) => {
      const texto = motivo.trim();
      if (!texto) return 0;
      const { data, error } = await supabase.rpc("registrar_motivo_ajuste" as any, {
        _tabela: tabela,
        _registro_id: registroId,
        _motivo: texto,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auditoria_ajustes"] }),
  });
}
