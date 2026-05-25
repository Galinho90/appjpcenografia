import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowRight, Phone, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isValidPhoneBR, maskPhoneBR } from "@/lib/phone";
import { toast } from "@/hooks/use-toast";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import { supabase } from "@/integrations/supabase/client";
import logoJpEventos from "@/assets/logo-jp-eventos.png";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const { data: empresa } = useCompanyLogo();
  const logoSrc = empresa?.logo_url || logoJpEventos;
  const brandName = empresa?.nome_fantasia || empresa?.razao_social || "JP Eventos";

  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhoneBR(phone)) {
      toast({ title: "Celular inválido", description: "Informe DDD + número.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha inválida", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(phone, password);
    setSubmitting(false);
    if (error) {
      const isInativo = error.toLowerCase().includes("inativ");
      toast({
        title: isInativo ? "Usuário inativo" : "Falha no login",
        description: isInativo
          ? "Seu acesso está inativo. Procure o administrador."
          : "Celular ou senha incorretos.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
    navigate("/", { replace: true });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhoneBR(forgotPhone)) {
      toast({ title: "Celular inválido", description: "Informe DDD + número.", variant: "destructive" });
      return;
    }
    setForgotSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-self", {
        body: { telefone: forgotPhone },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setForgotSent(true);
      toast({ title: "Link enviado", description: "Verifique seu e-mail para redefinir a senha." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-[#0B1120]">
      {/* Left: Branding */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-[#0f172a]" />
        <div className="absolute top-[-10%] left-[-10%] w-[28rem] h-[28rem] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[28rem] h-[28rem] bg-indigo-500/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, #94a3b8 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 p-12 text-center">
          <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-[#1e293b]/60 border border-slate-700/50 rounded-3xl shadow-lg overflow-hidden backdrop-blur-sm">
            <div className="w-16 h-16 bg-[#1e293b] rounded-lg flex items-center justify-center p-1.5 shadow-md">
              <img src={logoSrc} alt={brandName} className="h-full w-full object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100 mb-4">{brandName}</h1>
          <p className="text-lg text-slate-400 max-w-sm mx-auto font-light leading-relaxed">
            Excelência em gestão para os melhores profissionais de eventos.
          </p>
        </div>
      </aside>

      {/* Right: Form */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-32">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center p-1 shadow-md border border-slate-700/50">
              <img src={logoSrc} alt={brandName} className="h-full w-full object-contain" />
            </div>
            <span className="text-slate-100 font-semibold text-xl tracking-tight">{brandName}</span>
          </div>

          <header className="mb-10">
            <h2 className="text-3xl font-semibold text-slate-100 mb-2 tracking-tight">Bem-Vindo</h2>
            <p className="text-slate-400">Acesse sua conta para gerenciar seus serviços.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 group">
              <Label
                htmlFor="phone"
                className="text-xs font-medium uppercase tracking-widest text-slate-500 ml-1 group-focus-within:text-blue-400 transition-colors"
              >
                Celular
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-500" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-8888"
                  value={phone}
                  onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                  autoComplete="tel"
                  className="h-auto w-full bg-[#1e293b]/80 border border-slate-700 text-slate-100 pl-12 pr-4 py-4 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-1 focus-visible:border-blue-500/50 transition-all outline-none placeholder:text-slate-600 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-widest text-slate-500 ml-1 group-focus-within:text-blue-400 transition-colors"
                >
                  Senha
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotDialog(true);
                    setForgotSent(false);
                    setForgotPhone("");
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Esqueci minha senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-auto w-full bg-[#1e293b]/80 border border-slate-700 text-slate-100 pl-12 pr-12 py-4 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-1 focus-visible:border-blue-500/50 transition-all outline-none placeholder:text-slate-600 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="group w-full h-auto bg-white text-slate-900 font-semibold py-4 rounded-xl hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
            >
              {submitting ? "Entrando..." : "Entrar"}
              <ArrowRight className="h-[18px] w-[18px] group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </Button>
          </form>

          <footer className="mt-12 text-center border-t border-slate-700/50 pt-8">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
              {brandName} · Plataforma de gestão
            </p>
          </footer>
        </div>
      </main>

      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent className="bg-[#0f172a] border border-slate-700 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Recuperar senha</DialogTitle>
            <DialogDescription className="text-slate-400">
              {forgotSent
                ? "Se o celular estiver cadastrado, você receberá um e-mail com instruções."
                : "Informe seu celular para enviarmos o link de redefinição."}
            </DialogDescription>
          </DialogHeader>
          {!forgotSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-500" />
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-8888"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(maskPhoneBR(e.target.value))}
                  autoComplete="tel"
                  className="h-auto w-full bg-[#1e293b]/80 border border-slate-700 text-slate-100 pl-12 pr-4 py-3 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-1 focus-visible:border-blue-500/50 transition-all outline-none placeholder:text-slate-600 shadow-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={forgotSubmitting}
                className="w-full bg-white text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
              >
                {forgotSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de redefinição"
                )}
              </Button>
            </form>
          ) : (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                onClick={() => setShowForgotDialog(false)}
                variant="outline"
                className="border-slate-700 text-slate-100 hover:bg-slate-800 hover:text-slate-100"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
