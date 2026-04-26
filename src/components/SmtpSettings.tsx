import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Save, SendHorizonal, PlugZap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type SmtpForm = {
  host: string;
  port: number;
  secure: "tls" | "ssl" | "none";
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  ativo: boolean;
};

const empty: SmtpForm = {
  host: "",
  port: 587,
  secure: "tls",
  username: "",
  password: "",
  from_email: "",
  from_name: "",
  ativo: true,
};

export default function SmtpSettings() {
  const [form, setForm] = useState<SmtpForm>(empty);
  const [passwordSet, setPasswordSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("smtp-config", { method: "GET" });
        if (error) throw error;
        const cfg = (data as any)?.config;
        if (cfg) {
          setForm({
            host: cfg.host ?? "",
            port: cfg.port ?? 587,
            secure: cfg.secure ?? "tls",
            username: cfg.username ?? "",
            password: "",
            from_email: cfg.from_email ?? "",
            from_name: cfg.from_name ?? "",
            ativo: !!cfg.ativo,
          });
          setPasswordSet(!!cfg.password_set);
        }
      } catch (e: any) {
        toast({ title: "Erro ao carregar SMTP", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const salvar = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      const { data, error } = await supabase.functions.invoke("smtp-config", {
        method: "POST",
        body: payload,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPasswordSet(true);
      setForm((f) => ({ ...f, password: "" }));
      toast({ title: "SMTP salvo", description: "Configuração atualizada com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const testarConexao = async () => {
    if (!form.password && !passwordSet) {
      toast({ title: "Senha obrigatória", description: "Preencha a senha SMTP para testar.", variant: "destructive" });
      return;
    }
    if (!form.password) {
      toast({ title: "Salve primeiro", description: "Digite a senha novamente para validar a conexão (a senha salva fica oculta).", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-send", {
        body: {
          action: "test_connection",
          smtp: {
            host: form.host, port: form.port, secure: form.secure,
            username: form.username, password: form.password,
            from_email: form.from_email, from_name: form.from_name || null,
          },
        },
      });
      if (error) throw error;
      const res = data as any;
      if (res.ok) toast({ title: "Conexão OK", description: "Servidor SMTP respondeu com sucesso." });
      else toast({ title: "Falha na conexão", description: res.error ?? "Erro desconhecido", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const enviarTeste = async () => {
    if (!testTo) {
      toast({ title: "Informe o destinatário", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      // Se digitou senha, manda inline; senão, usa a config salva
      const body: any = { action: "send_test", to: testTo };
      if (form.password) {
        body.smtp = {
          host: form.host, port: form.port, secure: form.secure,
          username: form.username, password: form.password,
          from_email: form.from_email, from_name: form.from_name || null,
        };
      }
      const { data, error } = await supabase.functions.invoke("smtp-send", { body });
      if (error) throw error;
      const res = data as any;
      if (res.ok) toast({ title: "E-mail enviado", description: `Enviado para ${testTo}` });
      else toast({ title: "Falha no envio", description: res.error ?? "Erro desconhecido", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="py-10 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Servidor SMTP</CardTitle>
          <CardDescription>
            Configure um servidor SMTP próprio para envio de e-mails do sistema (redefinição de senha, notificações).
            Funciona com Gmail (App Password), Outlook 365, SendGrid, Brevo, Amazon SES, cPanel etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Host SMTP</Label>
              <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>Porta</Label>
              <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Segurança</Label>
              <Select value={form.secure} onValueChange={(v) => setForm({ ...form, secure: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">STARTTLS (porta 587)</SelectItem>
                  <SelectItem value="ssl">SSL/TLS (porta 465)</SelectItem>
                  <SelectItem value="none">Nenhuma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Usuário SMTP</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="seu-email@dominio.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha SMTP {passwordSet && !form.password && <span className="text-xs text-muted-foreground">(salva — deixe em branco para manter)</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={passwordSet ? "••••••••" : "Senha ou App Password"} />
            </div>
            <div className="space-y-2">
              <Label>E-mail remetente (From)</Label>
              <Input type="email" value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} placeholder="noreply@suaempresa.com.br" />
            </div>
            <div className="space-y-2">
              <Label>Nome remetente</Label>
              <Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="JP Cenografia" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label>Ativo</Label>
              <p className="text-sm text-muted-foreground">Quando desativado, nenhum e-mail será enviado pelo sistema.</p>
            </div>
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar configuração"}
            </Button>
            <Button variant="outline" onClick={testarConexao} disabled={testing}>
              <PlugZap className="h-4 w-4 mr-2" />{testing ? "Testando..." : "Testar conexão"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enviar e-mail de teste</CardTitle>
          <CardDescription>Dispara um e-mail real para validar entrega completa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <Input type="email" placeholder="destino@email.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <Button onClick={enviarTeste} disabled={sending}>
              <SendHorizonal className="h-4 w-4 mr-2" />{sending ? "Enviando..." : "Enviar teste"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Usa a configuração salva. Se você acabou de digitar uma nova senha (sem salvar), o teste usa esses dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
