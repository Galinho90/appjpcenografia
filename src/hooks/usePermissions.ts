import { useAuth, type AppRole } from "@/hooks/useAuth";

export function usePermissions() {
  const { role, loading } = useAuth();
  const r: AppRole | null = role;
  return {
    role: r,
    loading,
    isAdmin: r === "admin",
    isGerente: r === "gerente",
    isVisualizador: r === "visualizador",
    /** Pode criar / editar / excluir registros operacionais. */
    canEdit: r === "admin" || r === "gerente",
    /** Pode acessar Configurações (gerenciar empresa, usuários e papéis). */
    canManageSettings: r === "admin",
  };
}
