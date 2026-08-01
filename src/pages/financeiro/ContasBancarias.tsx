import { useState } from "react";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useContasBancarias, useCreateContaBancaria, useUpdateContaBancaria, useDeleteContaBancaria,
  useSaldoConta, type ContaBancaria,
} from "@/hooks/useFinanceiro";
import { fmtBRL } from "@/lib/financeiro";
import { PageHeader } from "@/components/PageHeader";

const empty = { apelido: "", banco: "", agencia: "", conta: "", tipo: "corrente", saldo_inicial: 0, ativo: true, observacoes: "" };

function SaldoBadge({ contaId }: { contaId: string }) {
  const { data: saldo = 0, isLoading } = useSaldoConta(contaId);
  if (isLoading) return <Skeleton className="h-5 w-20" />;
  return <span className={`font-semibold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(saldo)}</span>;
}

export default function ContasBancarias() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const { data: contas = [], isLoading } = useContasBancarias();
  const createMut = useCreateContaBancaria();
  const updateMut = useUpdateContaBancaria();
  const deleteMut = useDeleteContaBancaria();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);

  const openCreate = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (c: ContaBancaria) => {
    setEditingId(c.id);
    setForm({
      apelido: c.apelido, banco: c.banco, agencia: c.agencia ?? "", conta: c.conta ?? "",
      tipo: c.tipo, saldo_inicial: c.saldo_inicial, ativo: c.ativo, observacoes: c.observacoes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.apelido.trim() || !form.banco.trim()) {
      return toast({ title: "Apelido e banco obrigatórios", variant: "destructive" });
    }
    try {
      const payload = { ...form, saldo_inicial: Number(form.saldo_inicial) || 0 };
      if (editingId) await updateMut.mutateAsync({ id: editingId, ...payload });
      else await createMut.mutateAsync(payload);
      toast({ title: editingId ? "Atualizada" : "Criada" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const del = async () => {
    if (!deleteId) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      toast({ title: "Excluída" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Contas Bancárias" description="Gerencie suas contas e caixas internos" />
        {isAdmin && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Conta</Button>}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contas.map((c) => (
            <Card key={c.id} className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2 truncate">
                    <Wallet className="h-4 w-4 text-primary shrink-0" /> {c.apelido}
                  </span>
                  <div className="flex gap-1">
                    {c.integracao_id && <Badge variant="secondary" className="text-[10px]">Integração</Badge>}
                    {!c.ativo && <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">{c.banco} · {c.tipo}</div>
                {(c.agencia || c.conta) && (
                  <div className="text-xs text-muted-foreground">
                    {c.agencia && `Ag: ${c.agencia}`} {c.conta && `· Cc: ${c.conta}`}
                  </div>
                )}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Saldo</span>
                  <SaldoBadge contaId={c.id} />
                </div>
                {isAdmin && (
                  <div className="flex justify-end gap-1 pt-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!c.integracao_id && (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Conta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Apelido</Label>
                <Input value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Banco</Label>
                <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Agência</Label>
                <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <Input value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="caixa">Caixa Interno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Saldo inicial</Label>
                <Input type="number" step="0.01" value={form.saldo_inicial} onChange={(e) => setForm({ ...form, saldo_inicial: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativa</Label>
            </div>
            <Button className="w-full" onClick={save} disabled={createMut.isPending || updateMut.isPending}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>Não é possível excluir contas com movimentações vinculadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={del}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
