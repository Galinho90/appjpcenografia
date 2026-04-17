import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import Index from "./pages/Index";
import Colaboradores from "./pages/Colaboradores";
import Diarias from "./pages/Diarias";
import Fechamentos from "./pages/Fechamentos";
import Relatorios from "./pages/Relatorios";
import ExtratoDiarista from "./pages/ExtratoDiarista";
import Clientes from "./pages/Clientes";
import Categorias from "./pages/Categorias";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth><AppLayout>{children}</AppLayout></RequireAuth>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Index /></Protected>} />
            <Route path="/colaboradores" element={<Protected><Colaboradores /></Protected>} />
            <Route path="/diarias" element={<Protected><Diarias /></Protected>} />
            <Route path="/fechamentos" element={<Protected><Fechamentos /></Protected>} />
            <Route path="/relatorios" element={<Protected><Relatorios /></Protected>} />
            <Route path="/extrato" element={<Protected><ExtratoDiarista /></Protected>} />
            <Route path="/clientes" element={<Protected><Clientes /></Protected>} />
            <Route path="/categorias" element={<Protected><Categorias /></Protected>} />
            <Route path="/configuracoes" element={<Protected><RequireAdmin><Configuracoes /></RequireAdmin></Protected>} />
            <Route path="/minha-conta" element={<Protected><MinhaConta /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
