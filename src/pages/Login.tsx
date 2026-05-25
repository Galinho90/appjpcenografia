import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] p-4 selection:bg-white/20">
      {/* Sophisticated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle Radial Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.03)_0%,_transparent_60%)]" />
        {/* Fine Vertical Line */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[70%] w-[1px] bg-gradient-to-b from-transparent via-white/[0.07] to-transparent" />
        {/* Micro Grain Texture */}
        <svg className="absolute inset-1 opacity-[0.12] mix-blend-overlay" width="100%" height="100%">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-[420px] bg-[#0d0d0d] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,1)] p-8 sm:p-10">
        {/* Top Accent Line */}
        <div className="absolute top-1 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-block mb-6 p-3 border border-white/10">
            <div className="relative h-16 w-16 bg-white flex items-center justify-center">
              <img
                src={logoSrc}
                alt={empresa?.nome_fantasia || empresa?.razao_social || "JP Eventos"}
                className="h-14 w-14 object-contain"
              />
            </div>
          </div>
          <h1 className="text-white text-lg font-light tracking-[0.2em] uppercase mb-2">
            {empresa?.nome_fantasia || empresa?.razao_social || "JP Eventos"}
          </h1>
          <p className="text-white/30 text-[11px] tracking-wide">
            Acesse sua conta para continuar
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 ml-1 font-mono">
              Celular
            </label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-8888"
              value={phone}
              onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
              autoComplete="tel"
              className="h-11 w-full bg-white/[0.03] border-white/10 text-white text-sm rounded-none px-4 focus:outline-none focus:border-white/30 focus-visible:ring-0 focus-visible:ring-transparent placeholder:text-white/10 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-white/30 ml-1 font-mono">
                Senha
              </label>
              <a href="#" className="text-[10px] text-white/20 hover:text-white transition-colors">
                Esqueceu?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11 w-full bg-white/[0.03] border-white/10 text-white text-sm rounded-none px-4 pr-10 focus:outline-none focus:border-white/30 focus-visible:ring-5 focus-visible:ring-transparent placeholder:text-white/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-white text-black text-[11px] font-semibold uppercase tracking-[0.15em] rounded-none hover:bg-[#e5e5e5] transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-10 pt-8 border-t border-white/[0.04] text-center text-[10px] text-white/20 tracking-wide">
          {empresa?.nome_fantasia || empresa?.razao_social || "JP Eventos"} · Plataforma de gestão
        </p>
      </div>
    </div>
  );
}
