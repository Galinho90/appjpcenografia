import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoCategoriaFin = "receita" | "despesa";
export type TipoMovimentacao = "entrada" | "saida" | "transferencia";
export type StatusMovimentacao = "pendente" | "pago" | "atrasado" | "cancelado";
export type OrigemMovimentacao = "manual" | "fechamento" | "inter_api";

export type ContaBancaria = {
  id: string;
  apelido: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo: string;
  saldo_inicial: number;
  ativo: boolean;
  observacoes: string | null;
};

export type CategoriaFinanceira = {
  id: string;
  nome: string;
  tipo: TipoCategoriaFin;
  cor: string;
  icone: string;
  sistema: boolean;
  ativo: boolean;
};

export type MovimentacaoFinanceira = {
  id: string;
  conta_id: string;
  conta_destino_id: string | null;
  categoria_id: string | null;
  tipo: TipoMovimentacao;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: StatusMovimentacao;
  descricao: string;
  observacoes: string | null;
  cliente_id: string | null;
  colaborador_id: string | null;
  fechamento_id: string | null;
  origem: OrigemMovimentacao;
  comprovante_url: string | null;
  recorrente: boolean;
  created_at: string;
  categoria?: CategoriaFinanceira | null;
  conta?: ContaBancaria | null;
  colaborador?: { id: string; nome: string } | null;
  cliente?: { id: string; razao_social: string } | null;
};

// ── Contas Bancárias ──
export function useContasBancarias() {
  return useQuery({
    queryKey: ["contas_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_bancarias" as any)
        .select("*")
        .order("apelido");
      if (error) throw error;
      return ((data ?? []) as any[]).map((c) => ({ ...c, saldo_inicial: Number(c.saldo_inicial) })) as ContaBancaria[];
    },
  });
}

export function useCreateContaBancaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ContaBancaria>) => {
      const { error } = await supabase.from("contas_bancarias" as any).insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contas_bancarias"] }),
  });
}

export function useUpdateContaBancaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ContaBancaria> & { id: string }) => {
      const { error } = await supabase.from("contas_bancarias" as any).update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contas_bancarias"] }),
  });
}

export function useDeleteContaBancaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contas_bancarias" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contas_bancarias"] }),
  });
}

// ── Categorias Financeiras ──
export function useCategoriasFinanceiras() {
  return useQuery({
    queryKey: ["categorias_financeiras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_financeiras" as any)
        .select("*")
        .order("tipo")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as CategoriaFinanceira[];
    },
  });
}

export function useCreateCategoriaFinanceira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CategoriaFinanceira>) => {
      const { error } = await supabase.from("categorias_financeiras" as any).insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias_financeiras"] }),
  });
}

export function useUpdateCategoriaFinanceira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CategoriaFinanceira> & { id: string }) => {
      const { error } = await supabase.from("categorias_financeiras" as any).update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias_financeiras"] }),
  });
}

export function useDeleteCategoriaFinanceira() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias_financeiras" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias_financeiras"] }),
  });
}

// ── Movimentações ──
type MovFilters = {
  dataInicio?: string;
  dataFim?: string;
  contaId?: string;
  categoriaId?: string;
  tipo?: TipoMovimentacao | "all";
  status?: StatusMovimentacao | "all";
};

export function useMovimentacoes(filters: MovFilters = {}) {
  return useQuery({
    queryKey: ["movimentacoes_financeiras", filters],
    queryFn: async () => {
      let q = supabase
        .from("movimentacoes_financeiras" as any)
        .select(`
          *,
          categoria:categorias_financeiras(*),
          conta:contas_bancarias(*),
          colaborador:colaboradores(id, nome),
          cliente:clientes(id, razao_social)
        `)
        .order("data_vencimento", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (filters.dataInicio) q = q.gte("data_vencimento", filters.dataInicio);
      if (filters.dataFim) q = q.lte("data_vencimento", filters.dataFim);
      if (filters.contaId && filters.contaId !== "all") q = q.eq("conta_id", filters.contaId);
      if (filters.categoriaId && filters.categoriaId !== "all") q = q.eq("categoria_id", filters.categoriaId);
      if (filters.tipo && filters.tipo !== "all") q = q.eq("tipo", filters.tipo);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);

      const { data, error } = await q.limit(1000);
      if (error) throw error;
      return ((data ?? []) as any[]).map((m) => ({ ...m, valor: Number(m.valor) })) as MovimentacaoFinanceira[];
    },
  });
}

export function useCreateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<MovimentacaoFinanceira>) => {
      const { error } = await supabase.from("movimentacoes_financeiras" as any).insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] }),
  });
}

export function useUpdateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MovimentacaoFinanceira> & { id: string }) => {
      const { error } = await supabase.from("movimentacoes_financeiras" as any).update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] }),
  });
}

export function useDeleteMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movimentacoes_financeiras" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] }),
  });
}

export function useSaldoConta(contaId: string | null, dataRef?: string) {
  return useQuery({
    queryKey: ["saldo_conta", contaId, dataRef],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_saldo_conta" as any, {
        _conta_id: contaId,
        ...(dataRef ? { _data_ref: dataRef } : {}),
      } as any);
      if (error) throw error;
      return Number(data ?? 0);
    },
  });
}
