import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCompanyLogo() {
  return useQuery({
    queryKey: ["company_logo"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_company_branding");
      if (error) throw error;
      return Array.isArray(data) ? data[0] ?? null : data ?? null;
    },
    staleTime: 60_000,
  });
}
