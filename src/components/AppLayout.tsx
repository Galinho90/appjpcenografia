import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, signOut } = useAuth();
  const { data: profile } = useMyProfile();
  const navigate = useNavigate();
  const meta = (user?.user_metadata ?? {}) as { nome?: string; phone?: string };
  const displayName =
    profile?.nome ||
    meta.nome ||
    meta.phone ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const initials = getInitials(displayName);
  const avatarUrl = profile?.avatar_url;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="surface-glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 sm:gap-4 sm:px-5">
            <SidebarTrigger className="h-9 w-9 shrink-0" aria-label="Alternar menu lateral" />
            <div className="flex-1" />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex min-h-10 items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Abrir menu da conta"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary ring-2 ring-primary/15">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary-foreground">{initials}</span>
                    )}
                  </div>
                  <div className="hidden flex-col items-start leading-tight sm:flex">
                    <span className="max-w-[180px] truncate text-sm font-semibold text-foreground">{displayName}</span>
                    {role && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {role === "admin" ? "Administrador" : role === "gerente" ? "Gerente" : role === "visualizador" ? "Visualizador" : role}
                      </span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/minha-conta")}>
                  <User className="mr-2 h-4 w-4" />
                  Minha conta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7">
            <div key={location.pathname} className="mx-auto w-full max-w-[1600px] animate-page-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
