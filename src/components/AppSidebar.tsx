import {
  LayoutDashboard, Users, CalendarDays, FileBarChart, FileText,
  Settings, Building2, Tags,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  { title: "Diaristas", url: "/colaboradores", icon: Users },
  { title: "Clientes", url: "/clientes", icon: Building2 },
  { title: "Categorias", url: "/categorias", icon: Tags },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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

      <SidebarFooter className="p-4">
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
      </SidebarFooter>
    </Sidebar>
  );
}
