import { useState } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
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
import { PageHeader } from "@/components/PageHeader";
  useCategoriasFinanceiras, useCreateCategoriaFinanceira, useUpdateCategoriaFinanceira, useDeleteCategoriaFinanceira,
  type CategoriaFinanceira,
} from "@/hooks/useFinanceiro";

const cores = ["#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#EC4899", "#0EA5E9", "#F97316", "#14B8A6", "#8B5CF6", "#64748B"];
const empty = { nome: "", tipo: "despesa" as "receita" | "despesa", cor: "#7C3AED", icone: "tag", ativo: true };

export default function CategoriasFinanceiras() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const { data: categorias = [], isLoading } = useCategoriasFinanceiras();
  const createMut = useCreateCategoriaFinanceira();
  const updateMut = useUpdateCategoriaFinanceira();
  const deleteMut = useDeleteCategoriaFinanceira();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (c: CategoriaFinanceira) => {
    setEditingId(c.id);
    setForm({ nome: c.nome, tipo: c.tipo, cor: c.cor, icone: c.icone, ativo: c.ativo });
    setOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim()) return toast({ title: "Nome obrigatório", variant: "destructive" });
    try {
      if (editingId) await updateMut.mutateAsync({ id: editingId, ...form });
      else await createMut.mutateAsync(form);
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
        <PageHeader title="Categorias Financeiras" description="Plano de contas usado nas movimentações" />
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 w-full sm:w-auto"><Plus className="h-4 w-4" /> Nova Categoria</Button>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Tags className="h-4 w-4 text-primary" /> Lista</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categorias.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="h-4 w-4 rounded-full shrink-0" style={{ background: c.cor }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{c.nome}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {c.tipo === "receita" ? "Receita" : "Despesa"}
                        </Badge>
                        {c.sistema && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
                        {!c.ativo && <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!c.sistema && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Nova"} Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita (entrada)</SelectItem>
                  <SelectItem value="despesa">Despesa (saída)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {cores.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, cor: c })}
                    className={`h-8 w-8 rounded-full border-2 transition ${form.cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativa</Label>
            </div>
            <Button className="w-full" onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>Movimentações vinculadas podem causar erro.</AlertDialogDescription>
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
