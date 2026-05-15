import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";

type Integracao = {
  id: string;
  banco: "inter" | "c6";
  apelido: string;
  ativo: boolean;
  ambiente: "homolog" | "producao";
  conta_corrente: string | null;
  observacoes: string | null;
};

const SECRETS_POR_BANCO: Record<string, string[]> = {
  inter: ["INTER_CLIENT_ID", "INTER_CLIENT_SECRET", "INTER_CERT_PEM", "INTER_KEY_PEM", "INTER_CONTA_CORRENTE"],
  c6: ["C6_CLIENT_ID", "C6_CLIENT_SECRET", "C6_CERT_PEM", "C6_KEY_PEM", "C6_CONTA_CORRENTE"],
};

const emptyForm = {
  banco: "inter" as "inter" | "c6",
  apelido: "",
  ambiente: "homolog" as "homolog" | "producao",
  conta_corrente: "",
  observacoes: "",
};

export default function IntegracoesBancariasSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: integracoes = [], isLoading } = useQuery({
    queryKey: ["integracoes_bancarias"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("integracoes_bancarias")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Integracao[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("integracoes_bancarias").insert({
        banco: form.banco,
        apelido: form.apelido,
        ambiente: form.ambiente,
        conta_corrente: form.conta_corrente || null,
        observacoes: form.observacoes || null,
        ativo: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integracoes_bancarias"] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Integração criada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const ativarMut = useMutation({
    mutationFn: async (id: string) => {
      // desativa todas e ativa a escolhida
      const { error: e1 } = await (supabase as any)
        .from("integracoes_bancarias")
        .update({ ativo: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (e1) throw e1;
      const { error: e2 } = await (supabase as any)
        .from("integracoes_bancarias")
        .update({ ativo: true })
        .eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integracoes_bancarias"] });
      toast({ title: "Integração ativada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const desativarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("integracoes_bancarias")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes_bancarias"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("integracoes_bancarias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integracoes_bancarias"] });
      toast({ title: "Integração removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Integrações Bancárias — PIX</CardTitle>
          <CardDescription>
            Cadastre o banco que será usado para pagar fechamentos via PIX. Apenas uma integração pode ficar ativa.
          </CardDescription>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : integracoes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma integração cadastrada. Clique em <span className="font-medium">Nova</span> para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apelido</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integracoes.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.apelido}</TableCell>
                  <TableCell className="uppercase">{i.banco}</TableCell>
                  <TableCell>
                    <Badge variant={i.ambiente === "producao" ? "default" : "secondary"}>{i.ambiente}</Badge>
                  </TableCell>
                  <TableCell>{i.conta_corrente ?? "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={i.ativo}
                      onCheckedChange={(v) => (v ? ativarMut.mutate(i.id) : desativarMut.mutate(i.id))}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(i.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
          <p className="font-medium">Credenciais (secrets)</p>
          <p className="text-muted-foreground">
            As credenciais sensíveis (client id, client secret, certificados) ficam armazenadas como secrets do
            Supabase. Sem elas, o pagamento opera em <strong>modo simulado</strong> — registra log e marca o
            fechamento como pago, mas não envia transação real ao banco.
          </p>
          {Object.entries(SECRETS_POR_BANCO).map(([banco, secrets]) => (
            <div key={banco} className="pt-2">
              <p className="font-medium uppercase text-xs">{banco}</p>
              <ul className="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                {secrets.map((s) => (
                  <li key={s} className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova integração bancária</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Banco</Label>
              <Select value={form.banco} onValueChange={(v) => setForm({ ...form, banco: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inter">Banco Inter</SelectItem>
                  <SelectItem value="c6">C6 Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Apelido</Label>
              <Input value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} placeholder="Ex.: Inter principal" />
            </div>
            <div>
              <Label>Ambiente</Label>
              <Select value={form.ambiente} onValueChange={(v) => setForm({ ...form, ambiente: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homolog">Homologação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta corrente</Label>
              <Input value={form.conta_corrente} onChange={(e) => setForm({ ...form, conta_corrente: e.target.value })} placeholder="Ex.: 123456-7" />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.apelido || createMut.isPending}
            >
              {createMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
