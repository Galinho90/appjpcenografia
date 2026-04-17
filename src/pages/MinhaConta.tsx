import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function MinhaConta() {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as { nome?: string; phone?: string };
  const [nome, setNome] = useState(meta.nome ?? "");
  const [savingNome, setSavingNome] = useState(false);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);

  const salvarNome = async () => {
    setSavingNome(true);
    const { error } = await supabase.auth.updateUser({ data: { ...meta, nome } });
    setSavingNome(false);
    if (error) return toast.error(error.message);
    toast.success("Nome atualizado");
  };

  const salvarSenha = async () => {
    if (novaSenha.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (novaSenha !== confirmar) return toast.error("As senhas não coincidem");
    setSavingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingSenha(false);
    if (error) return toast.error(error.message);
    setNovaSenha("");
    setConfirmar("");
    toast.success("Senha atualizada");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Atualize seu nome e senha de acesso.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Celular: {meta.phone ?? "—"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <Button onClick={salvarNome} disabled={savingNome}>
            {savingNome ? "Salvando..." : "Salvar nome"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>Mínimo de 6 caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova">Nova senha</Label>
            <Input id="nova" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conf">Confirmar nova senha</Label>
            <Input id="conf" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <Button onClick={salvarSenha} disabled={savingSenha}>
            {savingSenha ? "Salvando..." : "Atualizar senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
