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
import { cn } from "@/lib/utils";
import logoJpEventos from "@/assets/logo-jp-eventos.png";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

type Tone = "primary" | "secondary" | "accent";
type MenuItem = { title: string; url: string; icon: any };
type MenuSection = { title: string; icon: any; items: MenuItem[]; tone: Tone };

const toneClasses: Record<Tone, { icon: string; chip: string }> = {
  primary: { icon: "text-primary", chip: "bg-primary/10 text-primary" },
  secondary: { icon: "text-secondary", chip: "bg-secondary/10 text-secondary" },
  accent: { icon: "text-accent", chip: "bg-accent/10 text-accent" },
};

const operacionalItems: MenuItem[] = [
  { title: "Lançamentos", url: "/diarias", icon: CalendarDays },
  { title: "Extrato do Diarista", url: "/extrato", icon: FileText },
  { title: "Fechamento", url: "/fechamentos", icon: Wallet },
  { title: "Notas Fiscais", url: "/notas-fiscais", icon: Receipt },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

const cadastrosItems: MenuItem[] = [
  { title: "Categorias", url: "/categorias", icon: Tags },
  { title: "Clientes", url: "/clientes", icon: Building2 },
  { title: "Diaristas", url: "/colaboradores", icon: Users },
];

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

const operacionalSection: MenuSection = { title: "Operacional", icon: ClipboardList, items: operacionalItems, tone: "primary" };
const financeiroBaseSection: MenuSection = { title: "Financeiro", icon: DollarSign, items: financeiroItems, tone: "secondary" };
const cadastrosSection: MenuSection = { title: "Cadastros", icon: FolderKanban, items: cadastrosItems, tone: "accent" };

const activePillClasses =
  "bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary hover:text-primary-foreground";
const itemBaseClasses =
  "rounded-lg transition-colors hover:bg-sidebar-accent";

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
  const tone = toneClasses[section.tone];

  if (collapsed) {
    return (
      <SidebarMenu>
        {section.items.map((item) => {
          const active = pathname === item.url;
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.title}
                className={cn("justify-center rounded-lg", active && activePillClasses)}
              >
                <NavLink to={item.url} className="justify-center">
                  <item.icon className={cn("h-4 w-4", !active && tone.icon)} />
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

  return (
    <Collapsible defaultOpen={isActiveSection} className="group/collapsible">
      <SidebarMenu>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className={cn(itemBaseClasses, "gap-3")}>
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tone.chip)}>
                <section.icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left text-sm font-medium">{section.title}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="ml-4 border-l border-sidebar-border pl-3">
              {section.items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuSubItem key={item.title}>
                    <SidebarMenuSubButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          itemBaseClasses,
                          "gap-3 text-sm",
                          active && activePillClasses,
                        )}
                      >
                        <span className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          active ? "bg-white/20 text-white" : tone.chip,
                        )}>
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
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
  const displayName =
    (user?.user_metadata as any)?.nome ||
    (user?.user_metadata as any)?.phone ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const initials = displayName
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isVisualizador = role === "visualizador";
  const homeActive = location.pathname === "/";
  const settingsActive = location.pathname.startsWith("/configuracoes");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-sm">
      <SidebarHeader className={cn("border-b border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        {!collapsed ? (
          <div className="flex items-center justify-center">
            <img src={logoSrc} alt="Logo da empresa" className="h-12 w-auto object-contain" />
          </div>
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <img src={logoSrc} alt="Logo" className="h-6 w-6 object-contain" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Menu
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="space-y-1">
            <SidebarMenu>
              {!isVisualizador && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={homeActive}
                    tooltip="Home"
                    className={cn(
                      itemBaseClasses,
                      "gap-3",
                      collapsed && "justify-center",
                      homeActive && activePillClasses,
                    )}
                  >
                    <NavLink to="/" end className={collapsed ? "justify-center" : ""}>
                      {collapsed ? (
                        <LayoutDashboard className={cn("h-4 w-4", !homeActive && "text-primary")} />
                      ) : (
                        <>
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md",
                              homeActive ? "bg-white/20 text-white" : toneClasses.primary.chip,
                            )}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-medium">Home</span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {isVisualizador &&
                diaristaMenuItems.map((item) => {
                  const active = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          itemBaseClasses,
                          "gap-3",
                          collapsed && "justify-center",
                          active && activePillClasses,
                        )}
                      >
                        <NavLink to={item.url} className={collapsed ? "justify-center" : ""}>
                          {collapsed ? (
                            <item.icon className={cn("h-4 w-4", !active && "text-primary")} />
                          ) : (
                            <>
                              <span
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md",
                                  active ? "bg-white/20 text-white" : toneClasses.primary.chip,
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-medium">{item.title}</span>
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>

            {!isVisualizador && (
              <CollapsibleSection section={operacionalSection} collapsed={collapsed} pathname={location.pathname} />
            )}
            {!isVisualizador && (
              <CollapsibleSection section={financeiroBaseSection} collapsed={collapsed} pathname={location.pathname} />
            )}
            {!isVisualizador && (
              <CollapsibleSection section={cadastrosSection} collapsed={collapsed} pathname={location.pathname} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {canManageSettings && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Configurações"
                className={cn(
                  itemBaseClasses,
                  "gap-3",
                  collapsed && "justify-center",
                  settingsActive && activePillClasses,
                )}
              >
                <NavLink to="/configuracoes" className={collapsed ? "justify-center" : ""}>
                  {collapsed ? (
                    <Settings className={cn("h-4 w-4", !settingsActive && "text-muted-foreground")} />
                  ) : (
                    <>
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          settingsActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Settings className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium">Configurações</span>
                    </>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        {!collapsed && user && (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</div>
              {role && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {role === "admin" ? "Administrador" : role === "gerente" ? "Gerente" : "Diarista"}
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive",
            collapsed ? "justify-center" : "justify-start gap-2",
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
