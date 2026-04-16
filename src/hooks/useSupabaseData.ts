import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Colaborador, Diaria, Vale, Reembolso, Fechamento, Cliente } from "@/types";

export type Categoria = {
  id: string;
  descricao: string;
  tipo: "C" | "D";
  ativo: boolean;
  created_at?: string;
};

export type Lancamento = {
  id: string;
  colaborador_id: string;
  categoria_id: string;
  data: string;
  valor: number;
  hora_entrada?: string | null;
  hora_saida?: string | null;
  descricao?: string | null;
  categoria?: Categoria;
  colaborador?: { id: string; nome: string };
};

// ── Categorias ──
export function useCategorias() {
  return useQuery({
    queryKey: ["categorias"],
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase.from("categorias").select("*").order("descricao");
      if (error) throw error;
      return (data ?? []) as Categoria[];
    },
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { descricao: string; tipo: "C" | "D"; ativo?: boolean }) => {
      const { error } = await supabase.from("categorias").insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Categoria> & { id: string }) => {
      const { error } = await supabase.from("categorias").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useDeleteCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

// ── Lançamentos ──
export function useLancamentos() {
  return useQuery({
    queryKey: ["lancamentos"],
    queryFn: async (): Promise<Lancamento[]> => {
      const { data, error } = await supabase
        .from("lancamentos")
        .select("*, categoria:categorias(*), colaborador:colaboradores(id, nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((l: any) => ({ ...l, valor: Number(l.valor) })) as Lancamento[];
    },
  });
}

export function useCreateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Lancamento, "id" | "categoria" | "colaborador">) => {
      const { error } = await supabase.from("lancamentos").insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useUpdateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Lancamento> & { id: string }) => {
      const { error } = await supabase.from("lancamentos").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}

export function useDeleteLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lancamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lancamentos"] }),
  });
}


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
      return (data ?? []).map((c: any) => ({
        ...c,
        telefone: c.telefone ?? "",
        chave_pix: c.chave_pix ?? "",
        banco: c.banco ?? "",
        agencia: c.agencia ?? "",
        conta: c.conta ?? "",
        rg: c.rg ?? "",
        data_nascimento: c.data_nascimento ?? "",
        email: c.email ?? "",
        pix: c.pix ?? "",
        foto_url: c.foto_url ?? "",
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

export function useUpdateDiaria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; colaborador_id: string; data: string; hora_entrada?: string; hora_saida?: string; valor: number; observacoes?: string }) => {
      const { error } = await supabase.from("diarias").update(data).eq("id", id);
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

export function useUpdateVale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; colaborador_id: string; data: string; valor: number; descricao?: string }) => {
      const { error } = await supabase.from("vales").update(data).eq("id", id);
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

export function useUpdateReembolso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; colaborador_id: string; data: string; valor: number; descricao?: string }) => {
      const { error } = await supabase.from("reembolsos").update(data).eq("id", id);
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

// ── Clientes ──
export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("razao_social");
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Cliente, "id" | "created_at">) => {
      const { error } = await supabase.from("clientes").insert(data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Cliente> & { id: string }) => {
      const { error } = await supabase.from("clientes").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}
