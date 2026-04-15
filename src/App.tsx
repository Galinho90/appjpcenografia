import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Colaboradores from "./pages/Colaboradores";
import Diarias from "./pages/Diarias";
import Vales from "./pages/Vales";
import Reembolsos from "./pages/Reembolsos";
import Fechamentos from "./pages/Fechamentos";
import Relatorios from "./pages/Relatorios";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/colaboradores" element={<AppLayout><Colaboradores /></AppLayout>} />
          <Route path="/diarias" element={<AppLayout><Diarias /></AppLayout>} />
          <Route path="/vales" element={<AppLayout><Vales /></AppLayout>} />
          <Route path="/reembolsos" element={<AppLayout><Reembolsos /></AppLayout>} />
          <Route path="/fechamentos" element={<AppLayout><Fechamentos /></AppLayout>} />
          <Route path="/relatorios" element={<AppLayout><Relatorios /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
