import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isValidPhoneBR, maskPhoneBR } from "@/lib/phone";
import { toast } from "@/hooks/use-toast";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";
import logoJpEventos from "@/assets/logo-jp-eventos.png";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
      toast({ title: "Falha no login", description: "Celular ou senha incorretos.", variant: "destructive" });
      return;
    }
    toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-20 w-20 rounded-xl bg-white flex items-center justify-center mb-2 shadow-md p-2">
            <img src={logoSrc} alt={empresa?.nome_fantasia || empresa?.razao_social || "JP Eventos"} className="h-full w-full object-contain" />
          </div>
          <CardDescription>Acesse o sistema com seu celular</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Celular</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="(11) 99999-8888"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              <LogIn className="h-4 w-4" /> {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
