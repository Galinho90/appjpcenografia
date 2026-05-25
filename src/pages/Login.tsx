import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isValidPhoneBR, maskPhoneBR } from "@/lib/phone";
import { toast } from "@/hooks/use-toast";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
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

  return (
    <div className="min-h-screen w-full flex items-stretch bg-[#050505] text-slate-200">
      {/* Left: Branding */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-[#121214]" />
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 p-12 text-center">
          <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-1.5">
              <img src={logoSrc} alt={brandName} className="h-full w-full object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-4">{brandName}</h1>
          <p className="text-lg text-zinc-400 max-w-sm mx-auto font-light leading-relaxed">
            Excelência em gestão para os melhores profissionais de eventos.
          </p>
        </div>
      </aside>

      {/* Right: Form */}
      <main className="flex-1 flex flex-col justify-center px-6 sm:px-16 lg:px-24 xl:px-32 bg-[#0A0A0B]">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
              <img src={logoSrc} alt={brandName} className="h-full w-full object-contain" />
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">{brandName}</span>
          </div>

          <header className="mb-10">
            <h2 className="text-3xl font-semibold text-white mb-2 tracking-tight">Bem-vindo de volta</h2>
            <p className="text-zinc-500">Acesse sua conta para gerenciar seus serviços.</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 group">
              <Label
                htmlFor="phone"
                className="text-xs font-medium uppercase tracking-widest text-zinc-500 ml-1 group-focus-within:text-white transition-colors"
              >
                Celular
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-zinc-600" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-8888"
                  value={phone}
                  onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                  autoComplete="tel"
                  className="h-auto w-full bg-zinc-900/50 border border-zinc-800 text-white pl-12 pr-4 py-4 rounded-xl focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:border-zinc-500 transition-all outline-none placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-widest text-zinc-500 ml-1 group-focus-within:text-white transition-colors"
                >
                  Senha
                </Label>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-zinc-600" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-auto w-full bg-zinc-900/50 border border-zinc-800 text-white pl-12 pr-12 py-4 rounded-xl focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:border-zinc-500 transition-all outline-none placeholder:text-zinc-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="group w-full h-auto bg-white text-[#050505] font-semibold py-4 rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {submitting ? "Entrando..." : "Entrar"}
              <ArrowRight className="h-[18px] w-[18px] group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
            </Button>
          </form>

          <footer className="mt-12 text-center border-t border-zinc-900 pt-8">
            <p className="text-[10px] uppercase tracking-widest text-zinc-700 font-medium">
              {brandName} · Plataforma de gestão
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
