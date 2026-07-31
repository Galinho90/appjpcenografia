import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireRole } from "@/components/RequireRole";
import Index from "./pages/Index";
import Colaboradores from "./pages/Colaboradores";
import Diarias from "./pages/Diarias";
import Fechamentos from "./pages/Fechamentos";
import Relatorios from "./pages/Relatorios";
import ExtratoDiarista from "./pages/ExtratoDiarista";
import Clientes from "./pages/Clientes";
import Categorias from "./pages/Categorias";
import Configuracoes from "./pages/Configuracoes";
import MinhaConta from "./pages/MinhaConta";
import MeuExtrato from "./pages/MeuExtrato";
import NotasFiscais from "./pages/NotasFiscais";
import MinhasNotasFiscais from "./pages/MinhasNotasFiscais";
import Login from "./pages/Login";
import RedefinirSenha from "./pages/RedefinirSenha";
import FinanceiroDashboard from "./pages/financeiro/FinanceiroDashboard";
import Movimentacoes from "./pages/financeiro/Movimentacoes";
import ContasPagar from "./pages/financeiro/ContasPagar";
import CategoriasFinanceiras from "./pages/financeiro/CategoriasFinanceiras";
import ContasBancarias from "./pages/financeiro/ContasBancarias";
import RelatoriosFinanceiros from "./pages/financeiro/RelatoriosFinanceiros";
import Fornecedores from "./pages/financeiro/Fornecedores";
import AuditoriaAjustes from "./pages/financeiro/AuditoriaAjustes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth><AppLayout>{children}</AppLayout></RequireAuth>
);

// Bloqueia rotas internas para visualizador (diarista) → redireciona p/ /meu-extrato
const Staff = ({ children }: { children: React.ReactNode }) => (
  <RequireRole roles={["admin", "gerente"]}>{children}</RequireRole>
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
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/" element={<Protected><Staff><Index /></Staff></Protected>} />
            <Route path="/colaboradores" element={<Protected><Staff><Colaboradores /></Staff></Protected>} />
            <Route path="/diarias" element={<Protected><Staff><Diarias /></Staff></Protected>} />
            <Route path="/fechamentos" element={<Protected><Staff><Fechamentos /></Staff></Protected>} />
            <Route path="/notas-fiscais" element={<Protected><Staff><NotasFiscais /></Staff></Protected>} />
            <Route path="/relatorios" element={<Protected><Staff><Relatorios /></Staff></Protected>} />
            <Route path="/extrato" element={<Protected><Staff><ExtratoDiarista /></Staff></Protected>} />
            <Route path="/clientes" element={<Protected><Staff><Clientes /></Staff></Protected>} />
            <Route path="/categorias" element={<Protected><Staff><Categorias /></Staff></Protected>} />
            <Route path="/financeiro" element={<Protected><Staff><FinanceiroDashboard /></Staff></Protected>} />
            <Route path="/financeiro/movimentacoes" element={<Protected><Staff><Movimentacoes /></Staff></Protected>} />
            <Route path="/financeiro/contas-pagar" element={<Protected><Staff><ContasPagar /></Staff></Protected>} />
            <Route path="/financeiro/categorias" element={<Protected><Staff><CategoriasFinanceiras /></Staff></Protected>} />
            <Route path="/financeiro/contas-bancarias" element={<Protected><Staff><ContasBancarias /></Staff></Protected>} />
            <Route path="/financeiro/relatorios" element={<Protected><Staff><RelatoriosFinanceiros /></Staff></Protected>} />
            <Route path="/financeiro/auditoria" element={<Protected><Staff><AuditoriaAjustes /></Staff></Protected>} />

            <Route path="/financeiro/fornecedores" element={<Protected><Staff><Fornecedores /></Staff></Protected>} />
            <Route path="/configuracoes" element={<Protected><RequireAdmin><Configuracoes /></RequireAdmin></Protected>} />
            <Route path="/meu-extrato" element={<Protected><MeuExtrato /></Protected>} />
            <Route path="/minhas-notas" element={<Protected><MinhasNotasFiscais /></Protected>} />
            <Route path="/minha-conta" element={<Protected><MinhaConta /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
