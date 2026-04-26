import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notificacao {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  link: string | null;
  lida: boolean;
  metadata: any;
  created_at: string;
}

export function useMinhasNotificacoes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notificacoes", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Notificacao[]> => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notificacoes", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return query;
}

export function useMarcarNotificacaoLida() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes", user?.id] }),
  });
}

export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("user_id", user!.id)
        .eq("lida", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes", user?.id] }),
  });
}

export async function criarNotificacao(input: {
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo?: string;
  link?: string;
  metadata?: any;
}) {
  const { error } = await supabase.from("notificacoes").insert({
    user_id: input.user_id,
    titulo: input.titulo,
    mensagem: input.mensagem,
    tipo: input.tipo ?? "info",
    link: input.link ?? null,
    metadata: input.metadata ?? null,
  });
  if (error) console.error("Erro ao criar notificação:", error);
}

/** Cria a mesma notificação para todos admins/gerentes. */
export async function criarNotificacaoParaAdmins(input: {
  titulo: string;
  mensagem: string;
  tipo?: string;
  link?: string;
  metadata?: any;
}) {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "gerente"]);
  if (error) {
    console.error("Erro buscando admins:", error);
    return;
  }
  const userIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
  if (userIds.length === 0) return;
  const rows = userIds.map((uid) => ({
    user_id: uid,
    titulo: input.titulo,
    mensagem: input.mensagem,
    tipo: input.tipo ?? "info",
    link: input.link ?? null,
    metadata: input.metadata ?? null,
  }));
  const { error: insErr } = await supabase.from("notificacoes").insert(rows);
  if (insErr) console.error("Erro ao notificar admins:", insErr);
}
