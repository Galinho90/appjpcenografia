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
      const { data: created, error } = await supabase
        .from("colaboradores")
        .insert(data)
        .select("id")
        .single();
      if (error) throw error;
      return created;
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

export function useGerarFechamentos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodo_inicio, periodo_fim }: { periodo_inicio: string; periodo_fim: string }) => {
      const { data: lancs, error: lErr } = await supabase
        .from("lancamentos")
        .select("colaborador_id, valor, categorias(tipo, descricao)")
        .gte("data", periodo_inicio)
        .lte("data", periodo_fim);
      if (lErr) throw lErr;

      const map = new Map<string, { diarias: number; vales: number; reembolsos: number }>();
      for (const l of lancs ?? []) {
        const cat: any = (l as any).categorias;
        const tipo = cat?.tipo as "C" | "D" | undefined;
        const desc = (cat?.descricao ?? "").toUpperCase();
        const valor = Number(l.valor) || 0;
        const cur = map.get(l.colaborador_id) ?? { diarias: 0, vales: 0, reembolsos: 0 };
        if (tipo === "C") {
          if (desc.includes("REEMBOLSO")) cur.reembolsos += valor;
          else cur.diarias += valor;
        } else if (tipo === "D") {
          cur.vales += valor;
        }
        map.set(l.colaborador_id, cur);
      }

      if (map.size === 0) {
        throw new Error("Nenhum lançamento encontrado nesta quinzena.");
      }

      const { data: existentes, error: eErr } = await supabase
        .from("fechamentos")
        .select("id, colaborador_id, status")
        .eq("periodo_inicio", periodo_inicio)
        .eq("periodo_fim", periodo_fim);
      if (eErr) throw eErr;

      const existMap = new Map((existentes ?? []).map(e => [e.colaborador_id, e]));
      const inserts: any[] = [];
      const updates: { id: string; payload: any }[] = [];

      for (const [colaborador_id, t] of map) {
        const totalDiarias = Math.round((Number(t.diarias) || 0) * 100) / 100;
        const totalVales = Math.round((Number(t.vales) || 0) * 100) / 100;
        const totalReembolsos = Math.round((Number(t.reembolsos) || 0) * 100) / 100;
        const valor_final = Math.round((totalDiarias + totalReembolsos - totalVales) * 100) / 100;
        const payload = {
          colaborador_id,
          periodo_inicio,
          periodo_fim,
          total_diarias: totalDiarias,
          total_vales: totalVales,
          total_reembolsos: totalReembolsos,
          valor_final,
        };
        const ex = existMap.get(colaborador_id);
        if (ex) {
          if (ex.status !== "pago") updates.push({ id: ex.id, payload });
        } else {
          inserts.push({ ...payload, status: "pendente" });
        }
      }

      if (inserts.length) {
        const { error } = await supabase.from("fechamentos").insert(inserts);
        if (error) throw error;
      }
      for (const u of updates) {
        const { error } = await supabase.from("fechamentos").update(u.payload).eq("id", u.id);
        if (error) throw error;
      }

      return { criados: inserts.length, atualizados: updates.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fechamentos"] }),
  });
}

export function useUpdateFechamentoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pendente" | "pago" | "erro" }) => {
      // Busca dados do fechamento para criar/remover lançamento espelho
      const { data: fech, error: fErr } = await supabase
        .from("fechamentos")
        .select("id, colaborador_id, valor_final, periodo_fim, status")
        .eq("id", id)
        .single();
      if (fErr) throw fErr;

      const { error } = await supabase.from("fechamentos").update({ status }).eq("id", id);
      if (error) throw error;

      if (status === "pago" && fech.status !== "pago") {
        // Localiza categoria "PAGAMENTO DE DIÁRIAS" (tipo D)
        const { data: cat } = await supabase
          .from("categorias")
          .select("id")
          .ilike("descricao", "PAGAMENTO%")
          .eq("tipo", "D")
          .limit(1)
          .maybeSingle();
        if (cat?.id) {
          await supabase.from("lancamentos").insert({
            colaborador_id: fech.colaborador_id,
            categoria_id: cat.id,
            data: fech.periodo_fim,
            valor: Number(fech.valor_final),
            descricao: "Pagamento de fechamento",
            fechamento_id: fech.id,
          } as any);
        }
      } else if (status !== "pago" && fech.status === "pago") {
        // Remove lançamentos espelho ao reabrir
        await (supabase.from("lancamentos") as any).delete().eq("fechamento_id", id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fechamentos"] });
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
    },
  });
}

export function useDeleteFechamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fechamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fechamentos"] }),
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

// ── Notas Fiscais ──
export type NotaFiscal = {
  id: string;
  fechamento_id: string;
  colaborador_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  numero?: string | null;
  valor: number;
  data_emissao?: string | null;
  arquivo_url: string;
  arquivo_nome?: string | null;
  status: "pendente" | "aprovada" | "rejeitada";
  observacoes?: string | null;
  rejeitada_em?: string | null;
  created_at?: string;
  updated_at?: string;
  colaborador?: { id: string; nome: string };
};

export function useNotasFiscais(periodo?: { inicio: string; fim: string }) {
  return useQuery({
    queryKey: ["notas_fiscais", periodo?.inicio, periodo?.fim],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async (): Promise<NotaFiscal[]> => {
      let q = supabase
        .from("notas_fiscais")
        .select("*")
        .order("created_at", { ascending: false });
      if (periodo) {
        q = q.eq("periodo_inicio", periodo.inicio).eq("periodo_fim", periodo.fim);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useMinhasNotasFiscais(colaboradorId?: string) {
  return useQuery({
    queryKey: ["minhas_notas_fiscais", colaboradorId],
    enabled: !!colaboradorId,
    queryFn: async (): Promise<NotaFiscal[]> => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .eq("colaborador_id", colaboradorId!)
        .order("periodo_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useUploadNotaFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      fechamento_id: string;
      colaborador_id: string;
      periodo_inicio: string;
      periodo_fim: string;
      numero?: string;
      valor: number;
      data_emissao?: string;
      observacoes?: string;
      user_id: string;
      existingId?: string;
    }) => {
      const ext = input.file.name.split(".").pop() || "bin";
      const path = `${input.user_id}/${input.fechamento_id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("notas-fiscais")
        .upload(path, input.file, { upsert: false, contentType: input.file.type });
      if (upErr) throw upErr;

      const payload = {
        fechamento_id: input.fechamento_id,
        colaborador_id: input.colaborador_id,
        periodo_inicio: input.periodo_inicio,
        periodo_fim: input.periodo_fim,
        numero: input.numero ?? null,
        valor: input.valor,
        data_emissao: input.data_emissao ?? null,
        arquivo_url: path,
        arquivo_nome: input.file.name,
        observacoes: input.observacoes ?? null,
        status: "pendente" as const,
        rejeitada_em: null as string | null,
      };

      const isReenvio = !!input.existingId;

      if (input.existingId) {
        const { error } = await supabase
          .from("notas_fiscais")
          .update(payload)
          .eq("id", input.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notas_fiscais").insert(payload);
        if (error) throw error;
      }

      // Notificações
      try {
        const { criarNotificacao, criarNotificacaoParaAdmins } = await import(
          "@/hooks/useNotificacoes"
        );
        const periodo = `${new Date(input.periodo_inicio + "T00:00:00").toLocaleDateString(
          "pt-BR"
        )} a ${new Date(input.periodo_fim + "T00:00:00").toLocaleDateString("pt-BR")}`;

        // Buscar nome do colaborador
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("nome")
          .eq("id", input.colaborador_id)
          .maybeSingle();
        const nomeColab = colab?.nome ?? "Diarista";

        if (isReenvio) {
          // Confirmação para o diarista
          await criarNotificacao({
            user_id: input.user_id,
            titulo: "NF reenviada",
            mensagem: `Sua nota fiscal da quinzena ${periodo} foi reenviada e está aguardando análise.`,
            tipo: "success",
            link: "/minhas-notas",
          });
          // Aviso para admins
          await criarNotificacaoParaAdmins({
            titulo: "NF reenviada para análise",
            mensagem: `${nomeColab} reenviou a NF da quinzena ${periodo}.`,
            tipo: "info",
            link: "/notas-fiscais",
          });
        } else {
          await criarNotificacao({
            user_id: input.user_id,
            titulo: "NF enviada",
            mensagem: `Sua nota fiscal da quinzena ${periodo} foi enviada e está aguardando análise.`,
            tipo: "success",
            link: "/minhas-notas",
          });
          await criarNotificacaoParaAdmins({
            titulo: "Nova NF para análise",
            mensagem: `${nomeColab} enviou uma NF da quinzena ${periodo}.`,
            tipo: "info",
            link: "/notas-fiscais",
          });
        }
      } catch (e) {
        console.error("Falha ao enviar notificações de NF:", e);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas_fiscais"] });
      qc.invalidateQueries({ queryKey: ["minhas_notas_fiscais"] });
    },
  });
}

export function useUpdateStatusNotaFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, observacoes }: { id: string; status: "pendente" | "aprovada" | "rejeitada"; observacoes?: string }) => {
      const payload: any = {
        status,
        observacoes: observacoes ?? null,
        rejeitada_em: status === "rejeitada" ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from("notas_fiscais")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      // Notificar diarista sobre rejeição/aprovação
      try {
        const { criarNotificacao } = await import("@/hooks/useNotificacoes");
        const { data: nota } = await supabase
          .from("notas_fiscais")
          .select("colaborador_id, periodo_inicio, periodo_fim")
          .eq("id", id)
          .maybeSingle();
        if (!nota) return;
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("user_id")
          .eq("id", nota.colaborador_id)
          .maybeSingle();
        if (!colab?.user_id) return;
        const periodo = `${new Date(nota.periodo_inicio + "T00:00:00").toLocaleDateString(
          "pt-BR"
        )} a ${new Date(nota.periodo_fim + "T00:00:00").toLocaleDateString("pt-BR")}`;

        if (status === "rejeitada") {
          await criarNotificacao({
            user_id: colab.user_id,
            titulo: "NF rejeitada",
            mensagem: `Sua nota fiscal da quinzena ${periodo} foi rejeitada. Motivo: ${
              observacoes ?? "não informado"
            }`,
            tipo: "error",
            link: "/minhas-notas",
          });
        } else if (status === "aprovada") {
          await criarNotificacao({
            user_id: colab.user_id,
            titulo: "NF aprovada",
            mensagem: `Sua nota fiscal da quinzena ${periodo} foi aprovada.`,
            tipo: "success",
            link: "/minhas-notas",
          });
        }
      } catch (e) {
        console.error("Falha ao notificar status de NF:", e);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas_fiscais"] }),
  });
}

export function useDeleteNotaFiscal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nota: { id: string; arquivo_url: string }) => {
      await supabase.storage.from("notas-fiscais").remove([nota.arquivo_url]);
      const { error } = await supabase.from("notas_fiscais").delete().eq("id", nota.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas_fiscais"] });
      qc.invalidateQueries({ queryKey: ["minhas_notas_fiscais"] });
    },
  });
}

export async function getNotaFiscalSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("notas-fiscais")
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
