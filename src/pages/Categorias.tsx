import { useMemo, useState } from "react";
import { Tags, Pencil, Trash2, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria,
  type Categoria,
} from "@/hooks/useSupabaseData";
import { usePermissions } from "@/hooks/usePermissions";

const emptyForm = { descricao: "", tipo: "C" as "C" | "D", ativo: true };

export default function Categorias() {
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const { data: categorias = [], isLoading } = useCategorias();
  const createMutation = useCreateCategoria();
  const updateMutation = useUpdateCategoria();
  const deleteMutation = useDeleteCategoria();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return categorias.filter((c) => c.descricao.toLowerCase().includes(q));
  }, [categorias, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Categoria) => {
    setEditingId(c.id);
    setForm({ descricao: c.descricao, tipo: c.tipo, ativo: c.ativo });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) {
      toast({ title: "Descrição obrigatória", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form });
        toast({ title: "Categoria atualizada" });
      } else {
        await createMutation.mutateAsync(form);
        toast({ title: "Categoria criada" });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Categoria excluída" });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const toggleAtivo = async (c: Categoria) => {
    try {
      await updateMutation.mutateAsync({ id: c.id, ativo: !c.ativo });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">Categorias usadas nos lançamentos do extrato</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Nova Categoria
          </Button>
        )}
      </div>

      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-base font-semibold">
              <Tags className="h-4 w-4 text-primary" /> Lista de Categorias
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Nenhuma categoria encontrada</div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((c) => (
                  <Card key={c.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium break-words">{c.descricao}</p>
                          <Badge variant={c.tipo === "C" ? "default" : "secondary"} className="mt-1">
                            {c.tipo === "C" ? "Crédito" : "Débito"}
                          </Badge>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Switch checked={c.ativo} disabled={!canEdit} onCheckedChange={() => toggleAtivo(c)} />
                        <span className="text-xs text-muted-foreground">
                          {c.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={c.tipo === "C" ? "default" : "secondary"}>
                            {c.tipo === "C" ? "Crédito" : "Débito"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={c.ativo} disabled={!canEdit} onCheckedChange={() => toggleAtivo(c)} />
                            <span className="text-xs text-muted-foreground">
                              {c.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value.toUpperCase() })}
                placeholder="Ex: HORAS EXTRAS"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "C" | "D" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="C">Crédito (soma a pagar)</SelectItem>
                  <SelectItem value="D">Débito (desconta do valor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Categorias usadas em lançamentos podem causar erro ao excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
