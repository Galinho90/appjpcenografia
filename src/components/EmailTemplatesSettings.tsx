import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Send, Eye, Code, RotateCcw } from "lucide-react";

type EmailTemplate = {
  id: string;
  key: string;
  description: string | null;
  subject: string;
  html: string;
  variables: string[];
};

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  password_reset: {
    nome: "João da Silva",
    empresa: "JP Cenografia",
    link: "https://app.exemplo.com/redefinir-senha?token=abc123",
  },
  test_email: {
    empresa: "JP Cenografia",
    data: new Date().toLocaleString("pt-BR"),
  },
  nota_fiscal_solicitacao: {
    nome: "João da Silva",
    empresa: "JP Cenografia",
    periodo_inicio: "01/04/2026",
    periodo_fim: "15/04/2026",
    total_diarias: "1.500,00",
    valor_final: "1.450,00",
    link: "https://app.exemplo.com/minhas-notas-fiscais",
  },
  nota_fiscal_recebida: {
    nome: "João da Silva",
    empresa: "JP Cenografia",
    numero: "00012345",
    valor: "1.450,00",
    periodo_inicio: "01/04/2026",
    periodo_fim: "15/04/2026",
  },
  nota_fiscal_aprovada: {
    nome: "João da Silva",
    empresa: "JP Cenografia",
    numero: "00012345",
    valor: "1.450,00",
    periodo_inicio: "01/04/2026",
    periodo_fim: "15/04/2026",
  },
  nota_fiscal_rejeitada: {
    nome: "João da Silva",
    empresa: "JP Cenografia",
    numero: "00012345",
    motivo: "Valor divergente do fechamento aprovado. Favor emitir nova nota com o valor correto.",
    valor: "1.450,00",
    periodo_inicio: "01/04/2026",
    periodo_fim: "15/04/2026",
    link: "https://app.exemplo.com/minhas-notas-fiscais",
  },
};

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

export default function EmailTemplatesSettings() {
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>("password_reset");
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testTo, setTestTo] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, key, description, subject, html, variables")
        .order("key");
      if (error) throw error;
      return (data ?? []) as unknown as EmailTemplate[];
    },
  });

  const current = useMemo(
    () => templates?.find((t) => t.key === selectedKey) ?? null,
    [templates, selectedKey],
  );

  useEffect(() => {
    if (current) setDraft({ ...current });
  }, [current]);

  const sampleVars = SAMPLE_VARS[selectedKey] ?? {};
  const previewSubject = draft ? renderTemplate(draft.subject, sampleVars) : "";
  const previewHtml = draft ? renderTemplate(draft.html, sampleVars) : "";

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("email_templates")
        .update({ subject: draft.subject, html: draft.html })
        .eq("id", draft.id);
      if (error) throw error;
      toast({ title: "Template salvo", description: "As alterações foram aplicadas." });
      qc.invalidateQueries({ queryKey: ["email_templates"] });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (current) setDraft({ ...current });
  }

  async function handleSendPreviewTest() {
    if (!draft || !testTo) {
      toast({ title: "Informe o e-mail de destino", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("smtp-send", {
        body: {
          action: "send_test",
          to: testTo,
          subject: previewSubject,
          html: previewHtml,
        },
      });
      if (error) throw error;
      if ((data as any)?.ok) {
        toast({ title: "E-mail enviado", description: `Preview enviado para ${testTo}` });
      } else {
        toast({
          title: "Falha ao enviar",
          description: (data as any)?.error ?? "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Templates de e-mail</CardTitle>
        <CardDescription>
          Personalize o assunto e o conteúdo HTML dos e-mails enviados pelo sistema.
          Use variáveis no formato <code>{`{{nome}}`}</code> para inserir dados dinâmicos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 max-w-md">
          <Label>Template</Label>
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="password_reset">Redefinição de senha</SelectItem>
              <SelectItem value="test_email">E-mail de teste</SelectItem>
              <SelectItem value="nota_fiscal_solicitacao">Nota Fiscal — Solicitação</SelectItem>
              <SelectItem value="nota_fiscal_recebida">Nota Fiscal — Recebida</SelectItem>
              <SelectItem value="nota_fiscal_aprovada">Nota Fiscal — Aprovada</SelectItem>
              <SelectItem value="nota_fiscal_rejeitada">Nota Fiscal — Rejeitada</SelectItem>
            </SelectContent>
          </Select>
          {draft?.description && (
            <p className="text-xs text-muted-foreground">{draft.description}</p>
          )}
        </div>

        {isLoading || !draft ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="grid gap-2">
              <Label>Variáveis disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {(draft.variables ?? []).map((v) => (
                  <Badge key={v} variant="secondary" className="font-mono">{`{{${v}}}`}</Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Assunto</Label>
              <Input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </div>

            <Tabs defaultValue="editor">
              <TabsList>
                <TabsTrigger value="editor"><Code className="h-4 w-4 mr-1" />Editor HTML</TabsTrigger>
                <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" />Pré-visualização</TabsTrigger>
              </TabsList>
              <TabsContent value="editor">
                <Textarea
                  value={draft.html}
                  onChange={(e) => setDraft({ ...draft, html: e.target.value })}
                  className="font-mono text-xs min-h-[320px]"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Assunto: </span>
                    <span className="font-medium">{previewSubject}</span>
                  </div>
                  <div className="rounded bg-background border overflow-hidden">
                    <iframe
                      title="Preview do e-mail"
                      srcDoc={previewHtml}
                      className="w-full min-h-[400px] border-0"
                      sandbox=""
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pré-visualização com valores de exemplo nas variáveis.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />{saving ? "Salvando…" : "Salvar template"}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-1" />Desfazer
              </Button>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label>Enviar pré-visualização por e-mail</Label>
              <div className="flex gap-2 max-w-xl">
                <Input
                  type="email"
                  placeholder="destinatario@exemplo.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <Button onClick={handleSendPreviewTest} disabled={sendingTest || !testTo}>
                  <Send className="h-4 w-4 mr-1" />
                  {sendingTest ? "Enviando…" : "Enviar"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Usa o conteúdo atualmente exibido no editor (com variáveis de exemplo) e a configuração SMTP ativa.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
