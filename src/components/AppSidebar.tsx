import {
  LayoutDashboard, Users, CalendarDays, FileBarChart, FileText,
  Settings, Building2, Tags, LogOut, Wallet, BarChart3, Receipt,
  DollarSign, ArrowDownUp, CalendarClock, Landmark, ChevronRight,
  ClipboardList, FolderKanban,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logoJpEventos from "@/assets/logo-jp-eventos.png";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

type MenuItem = { title: string; url: string; icon: any };
type MenuSection = { title: string; icon: any; items: MenuItem[] };

const operacionalItems: MenuItem[] = [
  { title: "Extrato do Diarista", url: "/extrato", icon: FileText },
  { title: "Fechamento", url: "/fechamentos", icon: Wallet },
  { title: "Lançamentos", url: "/diarias", icon: CalendarDays },
  { title: "Notas Fiscais", url: "/notas-fiscais", icon: Receipt },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

const cadastrosItems: MenuItem[] = [
  { title: "Categorias", url: "/categorias", icon: Tags },
  { title: "Clientes", url: "/clientes", icon: Building2 },
  { title: "Diaristas", url: "/colaboradores", icon: Users },
];

const operacionalSection: MenuSection = { title: "Operacional", icon: ClipboardList, items: operacionalItems };
const cadastrosSection: MenuSection = { title: "Cadastros", icon: FolderKanban, items: cadastrosItems };

const financeiroItems: MenuItem[] = [
  { title: "Dashboard", url: "/financeiro", icon: DollarSign },
  { title: "Movimentações", url: "/financeiro/movimentacoes", icon: ArrowDownUp },
  { title: "Contas a Pagar", url: "/financeiro/contas-pagar", icon: CalendarClock },
  { title: "Contas Bancárias", url: "/financeiro/contas-bancarias", icon: Landmark },
  { title: "Plano de Contas", url: "/financeiro/categorias", icon: Tags },
  { title: "Relatórios", url: "/financeiro/relatorios", icon: BarChart3 },
];

const diaristaMenuItems: MenuItem[] = [
  { title: "Meu Extrato", url: "/meu-extrato", icon: FileText },
  { title: "Minhas NFs", url: "/minhas-notas", icon: Receipt },
];

function CollapsibleSection({
  section,
  collapsed,
  pathname,
}: {
  section: MenuSection;
  collapsed: boolean;
  pathname: string;
}) {
  const isActiveSection = section.items.some((i) => pathname.startsWith(i.url));

  // When sidebar is collapsed (icon-only), render flat icons (no collapsible chevron)
  if (collapsed) {
    return (
      <SidebarMenu>
        {section.items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.url}
              tooltip={item.title}
              className="justify-center"
            >
              <NavLink
                to={item.url}
                className="hover:bg-sidebar-accent justify-center"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <item.icon className="h-4 w-4" />
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  return (
    <Collapsible defaultOpen={isActiveSection} className="group/collapsible">
      <SidebarMenu>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="hover:bg-sidebar-accent">
              <section.icon className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">{section.title}</span>
              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {section.items.map((item) => (
                <SidebarMenuSubItem key={item.title}>
                  <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </SidebarMenu>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { canManageSettings } = usePermissions();
  const { data: empresa } = useCompanyLogo();
  const logoSrc = empresa?.logo_url || logoJpEventos;
  const displayName = (user?.user_metadata as any)?.nome || (user?.user_metadata as any)?.phone || user?.email?.split("@")[0] || "Usuário";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isVisualizador = role === "visualizador";
  const financeiroSection: MenuSection = { title: "Financeiro", icon: DollarSign, items: financeiroItems };
  const financeiroActive = financeiroItems.some((i) => location.pathname.startsWith(i.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={collapsed ? "p-2" : "p-4"}>
        {!collapsed ? (
          <div className="rounded-lg bg-white px-3 py-2 w-fit mx-auto">
            <img src={logoSrc} alt="Logo da empresa" className="h-12 w-auto object-contain block" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center mx-auto">
            <img src={logoSrc} alt="Logo" className="h-6 w-6 object-contain" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/60">Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            {/* Home / topo */}
            <SidebarMenu>
              {!isVisualizador && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === "/"}
                    tooltip="Home"
                    className={collapsed ? "justify-center" : ""}
                  >
                    <NavLink
                      to="/"
                      end
                      className={`hover:bg-sidebar-accent ${collapsed ? "justify-center" : ""}`}
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <LayoutDashboard className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} />
                      {!collapsed && <span>Home</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isVisualizador && diaristaMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className={collapsed ? "justify-center" : ""}
                  >
                    <NavLink
                      to={item.url}
                      className={`hover:bg-sidebar-accent ${collapsed ? "justify-center" : ""}`}
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            {!isVisualizador && (
              <CollapsibleSection
                section={operacionalSection}
                collapsed={collapsed}
                pathname={location.pathname}
              />
            )}

            {!isVisualizador && (
              <CollapsibleSection
                section={financeiroSection}
                collapsed={collapsed}
                pathname={location.pathname}
              />
            )}

            {!isVisualizador && (
              <CollapsibleSection
                section={cadastrosSection}
                collapsed={collapsed}
                pathname={location.pathname}
              />
            )}

          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {canManageSettings && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Configurações">
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
            {role && role !== "visualizador" && (
              <div className="text-[10px] uppercase text-sidebar-foreground/40">
                {role === "admin" ? "Administrador" : role === "gerente" ? "Gerente" : role}
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleSignOut}
        >
          <LogOut className={collapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
