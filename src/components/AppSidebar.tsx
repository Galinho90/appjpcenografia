import {
  LayoutDashboard, Users, CalendarDays, FileBarChart, FileText,
  Settings, Building2, Tags, LogOut, Wallet, BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import logoJpEventos from "@/assets/logo-jp-eventos.png";

const menuItems = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Lançamentos", url: "/diarias", icon: CalendarDays },
  { title: "Extrato do Diarista", url: "/extrato", icon: FileText },
  { title: "Fechamento", url: "/fechamentos", icon: Wallet },
  { title: "Diaristas", url: "/colaboradores", icon: Users },
  { title: "Clientes", url: "/clientes", icon: Building2 },
  { title: "Categorias", url: "/categorias", icon: Tags },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { canManageSettings } = usePermissions();
  const displayName = (user?.user_metadata as any)?.nome || (user?.user_metadata as any)?.phone || user?.email?.split("@")[0] || "Usuário";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="rounded-lg bg-white px-3 py-2 flex items-center justify-center">
            <img src={logoJpEventos} alt="JP Eventos e Cenografia" className="h-12 w-auto object-contain" />
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center mx-auto">
            <img src={logoJpEventos} alt="JP" className="h-6 w-6 object-contain" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {canManageSettings && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/configuracoes" className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent">
                  <Settings className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Configurações</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {!collapsed && user && (
          <div className="px-2 pt-2 border-t border-sidebar-border">
            <div className="text-xs text-sidebar-foreground/60 truncate">{displayName}</div>
            {role && <div className="text-[10px] uppercase text-sidebar-foreground/40">{role}</div>}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
