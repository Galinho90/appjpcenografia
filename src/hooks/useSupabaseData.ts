import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Colaborador, Diaria, Vale, Reembolso, Fechamento } from "@/types";

// ── Colaboradores ──
export function useColaboradores() {
  return useQuery({
    queryKey: ["colaboradores"],
    queryFn: async (): Promise<Colaborador[]> => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((c) => ({
        ...c,
        telefone: c.telefone ?? "",
        chave_pix: c.chave_pix ?? "",
        banco: c.banco ?? "",
        agencia: c.agencia ?? "",
        conta: c.conta ?? "",
        valor_diaria_padrao: Number(c.valor_diaria_padrao),
      }));
    },
  });
}

export function useCreateColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Colaborador, "id" | "created_at" | "ativo">) => {
      const { error } = await supabase.from("colaboradores").insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["colaboradores"] }),
  });
}

export function useUpdateColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Colaborador> & { id: string }) => {
      const { error } = await supabase.from("colaboradores").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["colaboradores"] }),
  });
}

export function useDeleteColaborador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colaboradores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["colaboradores"] }),
  });
}

// ── Diárias ──
export function useDiarias() {
  return useQuery({
    queryKey: ["diarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diarias")
        .select("*, colaboradores(id, nome, funcao)")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d) => ({
        id: d.id,
        colaborador_id: d.colaborador_id,
        data: d.data,
        horario_entrada: d.hora_entrada ?? "",
        horario_saida: d.hora_saida ?? "",
        valor: Number(d.valor),
        observacoes: d.observacoes ?? "",
        colaborador: d.colaboradores as unknown as Colaborador | undefined,
      }));
    },
  });
}

export function useCreateDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { colaborador_id: string; data: string; hora_entrada?: string; hora_saida?: string; valor: number; observacoes?: string }) => {
      const { error } = await supabase.from("diarias").insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diarias"] }),
  });
}

export function useDeleteDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diarias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["diarias"] }),
  });
}

// ── Vales ──
export function useVales() {
  return useQuery({
    queryKey: ["vales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vales")
        .select("*, colaboradores(id, nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((v) => ({
        id: v.id,
        colaborador_id: v.colaborador_id,
        data: v.data,
        valor: Number(v.valor),
        descricao: v.descricao ?? "",
        colaborador: v.colaboradores as unknown as Colaborador | undefined,
      }));
    },
  });
}

export function useCreateVale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { colaborador_id: string; data: string; valor: number; descricao?: string }) => {
      const { error } = await supabase.from("vales").insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vales"] }),
  });
}

export function useDeleteVale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vales"] }),
  });
}

// ── Reembolsos ──
export function useReembolsos() {
  return useQuery({
    queryKey: ["reembolsos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reembolsos")
        .select("*, colaboradores(id, nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        colaborador_id: r.colaborador_id,
        data: r.data,
        valor: Number(r.valor),
        descricao: r.descricao ?? "",
        colaborador: r.colaboradores as unknown as Colaborador | undefined,
      }));
    },
  });
}

export function useCreateReembolso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { colaborador_id: string; data: string; valor: number; descricao?: string }) => {
      const { error } = await supabase.from("reembolsos").insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reembolsos"] }),
  });
}

export function useDeleteReembolso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reembolsos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reembolsos"] }),
  });
}

// ── Fechamentos ──
export function useFechamentos() {
  return useQuery({
    queryKey: ["fechamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fechamentos")
        .select("*, colaboradores(id, nome, funcao)")
        .order("periodo_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((f) => ({
        id: f.id,
        colaborador_id: f.colaborador_id,
        periodo_inicio: f.periodo_inicio,
        periodo_fim: f.periodo_fim,
        total_diarias: Number(f.total_diarias),
        total_vales: Number(f.total_vales),
        total_reembolsos: Number(f.total_reembolsos),
        valor_final: Number(f.valor_final),
        status: f.status as "pendente" | "pago" | "erro",
        colaborador: f.colaboradores as unknown as Colaborador | undefined,
      }));
    },
  });
}
