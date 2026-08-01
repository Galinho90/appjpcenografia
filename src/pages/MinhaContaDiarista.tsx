import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";

export default function MinhaContaDiarista() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: colaborador } = useQuery({
    queryKey: ["meu-colaborador", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, telefone, funcao, foto_url, pix, chave_pix, banco, agencia, conta")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [pix, setPix] = useState("");
  const [savingPix, setSavingPix] = useState(false);

  useEffect(() => {
    if (colaborador) setPix(colaborador.pix ?? colaborador.chave_pix ?? "");
  }, [colaborador]);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [savingSenha, setSavingSenha] = useState(false);

  const salvarPix = async () => {
    if (!colaborador?.id) return;
    setSavingPix(true);
    const { error } = await supabase
      .from("colaboradores")
      .update({ pix, chave_pix: pix })
      .eq("id", colaborador.id);
    setSavingPix(false);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["meu-colaborador"] });
    toast.success("Chave PIX atualizada");
  };

  const salvarSenha = async () => {
    if (!/^\d{6,}$/.test(novaSenha)) return toast.error("A senha deve ter no mínimo 6 números");
    if (novaSenha !== confirmar) return toast.error("As senhas não coincidem");
    setSavingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSavingSenha(false);
    if (error) return toast.error(error.message);
    setNovaSenha("");
    setConfirmar("");
    toast.success("Senha atualizada");
  };

  const initials = (colaborador?.nome || "U").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Minha conta" description="Seus dados pessoais são gerenciados pelo administrador. Você pode alterar sua chave PIX e senha." />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden shrink-0">
              {colaborador?.foto_url ? (
                <img src={colaborador.foto_url} alt={colaborador.nome} className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary-foreground text-xl font-bold">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-primary-foreground text-xl font-bold truncate">{colaborador?.nome ?? "—"}</p>
              {colaborador?.funcao && <p className="text-primary-foreground/90 text-sm">{colaborador.funcao}</p>}
              {colaborador?.telefone && <p className="text-primary-foreground/80 text-xs">{colaborador.telefone}</p>}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chave PIX</CardTitle>
          <CardDescription>Usada para receber seus pagamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pix">Chave PIX</Label>
            <Input id="pix" value={pix} onChange={(e) => setPix(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" />
          </div>
          <Button onClick={salvarPix} disabled={savingPix}>
            {savingPix ? "Salvando..." : "Salvar chave PIX"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>Apenas números, mínimo de 6 dígitos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nova">Nova senha</Label>
            <Input
              id="nova"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={20}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conf">Confirmar nova senha</Label>
            <Input
              id="conf"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              maxLength={20}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button onClick={salvarSenha} disabled={savingSenha}>
            {savingSenha ? "Salvando..." : "Atualizar senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
