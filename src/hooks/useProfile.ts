import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;

      // Se não houver avatar/nome no profile, busca do cadastro de colaborador
      if (!profile?.avatar_url || !profile?.nome) {
        const { data: colab } = await supabase
          .from("colaboradores")
          .select("nome, foto_url")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (colab) {
          return {
            id: profile?.id ?? null,
            user_id: user!.id,
            nome: profile?.nome ?? colab.nome ?? null,
            avatar_url: profile?.avatar_url ?? colab.foto_url ?? null,
          };
        }
      }

      return profile;
    },
    staleTime: 30_000,
  });
}
