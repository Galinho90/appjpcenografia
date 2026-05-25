import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Phone, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
      {/* Subtle light glow — monochrome */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/[0.02] blur-[100px]" />

      {/* Very faint dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Glow halo behind card */}
        <div className="absolute -inset-1 rounded-3xl bg-white/10 blur-xl" />

        <div className="relative rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-secondary blur-md opacity-50" />
              <div className="relative h-24 w-24 rounded-2xl bg-white flex items-center justify-center shadow-lg p-2 ring-1 ring-border/40">
                <img
                  src={logoSrc}
                  alt={empresa?.nome_fantasia || empresa?.razao_social || "JP Eventos"}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
              Bem-vindo de volta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Celular
              </Label>
              <div className="relative group">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-8888"
                  value={phone}
                  onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                  autoComplete="tel"
                  className="h-12 pl-10 bg-background/60 border-border/60 focus-visible:ring-primary/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Senha
              </Label>
              <div className="relative group">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-12 pl-10 pr-10 bg-background/60 border-border/60 focus-visible:ring-primary/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 gap-2 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
            >
              <LogIn className="h-4 w-4" />
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {empresa?.nome_fantasia || empresa?.razao_social || "JP Eventos"} · Plataforma de gestão
          </p>
        </div>
      </div>
    </div>
  );
}
