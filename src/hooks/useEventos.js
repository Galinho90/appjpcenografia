import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function useEventos() {
    return useQuery({
        queryKey: ["eventos"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("eventos")
                .select("*, movimentacoes_financeiras(valor, tipo, descricao, data_pagamento), evento_custos(*)")
                .order("created_at", { ascending: false });
            if (error)
                throw error;
            return data;
        },
    });
}
export function useEvento(id) {
    return useQuery({
        queryKey: ["eventos", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("eventos")
                .select("*, evento_custos(*), movimentacoes_financeiras(*)")
                .eq("id", id)
                .single();
            if (error)
                throw error;
            return data;
        },
        enabled: !!id,
    });
}
export function useCreateEvento() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (evento) => {
            const { data, error } = await supabase
                .from("eventos")
                .insert([evento])
                .select()
                .single();
            if (error)
                throw error;
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
        mutationFn: async ({ id, ...updates }) => {
            const { data, error } = await supabase
                .from("eventos")
                .update(updates)
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
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
        mutationFn: async (id) => {
            const { error } = await supabase
                .from("eventos")
                .delete()
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["eventos"] });
        },
    });
}
export function useCreateEventoCusto() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (custo) => {
            const { data, error } = await supabase
                .from("evento_custos")
                .insert([custo])
                .select()
                .single();
            if (error)
                throw error;
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
        mutationFn: async ({ id, evento_id }) => {
            const { error } = await supabase
                .from("evento_custos")
                .delete()
                .eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["eventos"] });
            queryClient.invalidateQueries({ queryKey: ["eventos", variables.evento_id] });
        },
    });
}
