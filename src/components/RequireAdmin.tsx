import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { canManageSettings, loading } = usePermissions();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }
  if (!canManageSettings) return <Navigate to="/" replace />;
  return <>{children}</>;
}
