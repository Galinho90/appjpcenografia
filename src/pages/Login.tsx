import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isValidPhoneBR, maskPhoneBR } from "@/lib/phone";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [bootName, setBootName] = useState("");
  const [bootPhone, setBootPhone] = useState("");
  const [bootPassword, setBootPassword] = useState("");
  const [bootSubmitting, setBootSubmitting] = useState(false);
  const { signIn, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  // Verifica se precisa criar primeiro admin
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true });
      setNeedsBootstrap((count ?? 0) === 0);
    })();
  }, []);

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

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootName.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!isValidPhoneBR(bootPhone)) {
      toast({ title: "Celular inválido", variant: "destructive" });
      return;
    }
    if (bootPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setBootSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-first-admin", {
        body: { nome: bootName, phone: bootPhone, password: bootPassword },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Admin criado", description: "Faça login com o celular e senha." });
      setPhone(bootPhone);
      setPassword("");
      setBootstrapOpen(false);
      setNeedsBootstrap(false);
    } catch (e: any) {
      toast({ title: "Erro ao criar admin", description: e.message, variant: "destructive" });
    } finally {
      setBootSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-2">
            <span className="text-primary-foreground font-bold text-xl">JP</span>
          </div>
          <CardTitle className="text-2xl">JP Eventos</CardTitle>
          <CardDescription>Acesse o sistema com seu celular</CardDescription>
        </CardHeader>
        <CardContent>
          {!bootstrapOpen ? (
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

              {needsBootstrap && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setBootstrapOpen(true)}
                >
                  <UserPlus className="h-4 w-4" /> Configurar primeiro acesso
                </Button>
              )}
            </form>
          ) : (
            <form onSubmit={handleBootstrap} className="grid gap-4">
              <div className="text-sm text-muted-foreground">
                Crie o primeiro usuário administrador. Esta opção só aparece enquanto não houver nenhum admin.
              </div>
              <div className="space-y-2">
                <Label htmlFor="bname">Nome</Label>
                <Input id="bname" value={bootName} onChange={(e) => setBootName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bphone">Celular</Label>
                <Input
                  id="bphone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-8888"
                  value={bootPhone}
                  onChange={(e) => setBootPhone(maskPhoneBR(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpass">Senha</Label>
                <Input
                  id="bpass"
                  type="password"
                  value={bootPassword}
                  onChange={(e) => setBootPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setBootstrapOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={bootSubmitting}>
                  {bootSubmitting ? "Criando..." : "Criar admin"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
