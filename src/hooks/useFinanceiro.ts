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
  integracao_id: string | null;
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

export type Fornecedor = {
  id: string;
  nome: string;
  tipo_documento: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  contato: string | null;
  chave_pix: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  categoria_padrao_id: string | null;
  observacoes: string | null;
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
  fornecedor_id: string | null;
  fechamento_id: string | null;
  origem: OrigemMovimentacao;
  comprovante_url: string | null;
  recorrente: boolean;
  created_at: string;
  categoria?: CategoriaFinanceira | null;
  conta?: ContaBancaria | null;
  colaborador?: { id: string; nome: string } | null;
  cliente?: { id: string; razao_social: string } | null;
  fornecedor?: { id: string; nome: string } | null;
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
          conta:contas_bancarias!movimentacoes_financeiras_conta_id_fkey(*),
          conta_destino:contas_bancarias!movimentacoes_financeiras_conta_destino_id_fkey(*),
          colaborador:colaboradores(id, nome),
          cliente:clientes(id, razao_social),
          fornecedor:fornecedores(id, nome)
        `);

      if (filters.contaId && filters.contaId !== "all") q = q.eq("conta_id", filters.contaId);
      if (filters.categoriaId && filters.categoriaId !== "all") q = q.eq("categoria_id", filters.categoriaId);
      if (filters.tipo && filters.tipo !== "all") q = q.eq("tipo", filters.tipo);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);

      const { data, error } = await q.limit(1000);
      if (error) throw error;
      let mapped = ((data ?? []) as any[]).map((m) => ({ ...m, valor: Number(m.valor) })) as MovimentacaoFinanceira[];

      // Filtro de período pela data efetiva (data_pagamento se pago, senão data_vencimento)
      if (filters.dataInicio || filters.dataFim) {
        mapped = mapped.filter((m: any) => {
          const d = (m.status === "pago" ? m.data_pagamento : m.data_vencimento) ?? "";
          if (!d) return false;
          if (filters.dataInicio && d < filters.dataInicio) return false;
          if (filters.dataFim && d > filters.dataFim) return false;
          return true;
        });
      }

      // Ordena: data efetiva desc → ordem_manual (asc, NULLS LAST) → created_at desc
      mapped.sort((a: any, b: any) => {
        const dataA = (a.status === "pago" ? a.data_pagamento : a.data_vencimento) ?? "";
        const dataB = (b.status === "pago" ? b.data_pagamento : b.data_vencimento) ?? "";
        if (dataA !== dataB) return dataB.localeCompare(dataA);
        const oA = a.ordem_manual;
        const oB = b.ordem_manual;
        if (oA != null && oB != null && oA !== oB) return oA - oB;
        if (oA != null && oB == null) return -1;
        if (oA == null && oB != null) return 1;
        return b.created_at.localeCompare(a.created_at);
      });


      return mapped;
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] });
      qc.invalidateQueries({ queryKey: ["saldos_por_dia"] });
      qc.invalidateQueries({ queryKey: ["saldo_contas"] });
    },
  });
}

export function useUpdateMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MovimentacaoFinanceira> & { id: string }) => {
      const { error } = await supabase.from("movimentacoes_financeiras" as any).update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] });
      qc.invalidateQueries({ queryKey: ["saldos_por_dia"] });
      qc.invalidateQueries({ queryKey: ["saldo_contas"] });
    },
  });
}

export function useDeleteMovimentacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("movimentacoes_financeiras" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] });
      qc.invalidateQueries({ queryKey: ["saldos_por_dia"] });
      qc.invalidateQueries({ queryKey: ["saldo_contas"] });
    },
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

/**
 * Saldo somado de várias contas (ou de todas quando `contaIds` vem vazio/null).
 * Evita a divergência de mostrar apenas o saldo da primeira conta no dashboard.
 */
export function useSaldoContas(contaIds: string[] | null, dataRef?: string) {
  const ids = (contaIds ?? []).filter(Boolean);
  return useQuery({
    queryKey: ["saldo_contas", ids.slice().sort().join(","), dataRef],
    enabled: ids.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const { data, error } = await supabase.rpc("get_saldo_conta" as any, {
            _conta_id: id,
            ...(dataRef ? { _data_ref: dataRef } : {}),
          } as any);
          if (error) throw error;
          return Number(data ?? 0);
        })
      );
      return results.reduce((s, v) => s + v, 0);
    },
  });
}

/**
 * Saldo acumulado (fechamento) de cada dia que possui movimentação paga.
 *
 * Espelha a lógica de `get_saldo_conta`:
 *  - saldo inicial das contas consideradas
 *  - + entradas, - saídas (status = 'pago')
 *  - transferências: -valor na conta origem, +valor na conta destino
 *
 * Retorna um Map<data ISO, saldo ao final do dia>, independente dos filtros
 * aplicados na tela — o saldo do dia precisa refletir o extrato bancário real.
 */
export function useSaldosPorDia(contaId?: string | null) {
  const { data: contas = [] } = useContasBancarias();
  const todosIds = contas.map((c) => c.id).sort();
  const escopo = contaId && contaId !== "all" ? [contaId] : todosIds;

  return useQuery({
    queryKey: ["saldos_por_dia", escopo.join(",")],
    enabled: contas.length > 0,
    queryFn: async () => {
      const ids = new Set(escopo);
      const saldoInicial = contas
        .filter((c) => ids.has(c.id))
        .reduce((s, c) => s + (Number(c.saldo_inicial) || 0), 0);

      const { data, error } = await supabase
        .from("movimentacoes_financeiras" as any)
        .select("tipo, valor, status, data_pagamento, data_vencimento, conta_id, conta_destino_id")
        .eq("status", "pago");
      if (error) throw error;

      // Delta por dia (data efetiva = pagamento, com fallback para vencimento)
      const porDia = new Map<string, number>();
      for (const m of ((data ?? []) as any[])) {
        const dia: string = m.data_pagamento ?? m.data_vencimento ?? "";
        if (!dia) continue;
        const valor = Number(m.valor) || 0;
        let delta = 0;
        if (m.tipo === "entrada" && ids.has(m.conta_id)) delta = valor;
        else if (m.tipo === "saida" && ids.has(m.conta_id)) delta = -valor;
        else if (m.tipo === "transferencia") {
          if (ids.has(m.conta_id)) delta -= valor;
          if (m.conta_destino_id && ids.has(m.conta_destino_id)) delta += valor;
        }
        if (delta === 0) continue;
        porDia.set(dia, (porDia.get(dia) ?? 0) + delta);
      }

      // Acumula em ordem crescente de data
      const saldos = new Map<string, number>();
      let acumulado = saldoInicial;
      for (const dia of [...porDia.keys()].sort()) {
        acumulado += porDia.get(dia) ?? 0;
        saldos.set(dia, acumulado);
      }
      return saldos;
    },
  });
}

// ── Fornecedores ──
export function useFornecedores(onlyActive = false) {
  return useQuery({
    queryKey: ["fornecedores", onlyActive],
    queryFn: async () => {
      let q = supabase.from("fornecedores" as any).select("*").order("nome");
      if (onlyActive) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Fornecedor[];
    },
  });
}

export function useCreateFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Fornecedor>) => {
      const { error } = await supabase.from("fornecedores" as any).insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

export function useUpdateFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Fornecedor> & { id: string }) => {
      const { error } = await supabase.from("fornecedores" as any).update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}

export function useDeleteFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });
}
