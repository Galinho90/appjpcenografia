import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatusEvento = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';

export interface Evento {
  id: string;
  nome: string;
  descricao: string | null;
  verba: number;
  status: StatusEvento;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventoCusto {
  id: string;
  evento_id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  movimentacao_id: string | null;
  created_at: string;
}

export function useEventos() {
  return useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*, movimentacoes_financeiras(valor, tipo, descricao, data_pagamento), evento_custos(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (Evento & { 
        movimentacoes_financeiras: { valor: number; tipo: string; descricao: string; data_pagamento: string }[];
        evento_custos: EventoCusto[];
      })[];
    },
  });
}

export function useEvento(id: string) {
  return useQuery({
    queryKey: ["eventos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*, evento_custos(*), movimentacoes_financeiras(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as (Evento & { evento_custos: EventoCusto[], movimentacoes_financeiras: any[] });
    },
    enabled: !!id,
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (evento: Omit<Evento, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("eventos")
        .insert([evento as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}

export function useUpdateEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Evento> & { id: string }) => {
      const { data, error } = await supabase
        .from("eventos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos", variables.id] });
    },
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("eventos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
    },
  });
}

export function useCreateEventoCusto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (custo: Omit<EventoCusto, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from("evento_custos")
        .insert([custo])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos", variables.evento_id] });
    },
  });
}

export function useDeleteEventoCusto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, evento_id }: { id: string; evento_id: string }) => {
      const { error } = await supabase
        .from("evento_custos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos", variables.evento_id] });
    },
  });
}