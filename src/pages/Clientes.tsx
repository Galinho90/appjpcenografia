import { useState } from "react";
import { Plus, Search, Edit, Trash2, Building2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente,
} from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import type { Cliente } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";

const emptyForm = {
  cnpj: "", razao_social: "", nome_fantasia: "", email: "", telefone: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
  cidade: "", uf: "", ativo: true,
};

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [buscando, setBuscando] = useState(false);
  const { toast } = useToast();
  const { canEdit } = usePermissions();

  const { data: clientes = [], isLoading } = useClientes();
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const deleteMutation = useDeleteCliente();

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.razao_social.toLowerCase().includes(q) ||
      (c.nome_fantasia ?? "").toLowerCase().includes(q) ||
      c.cnpj.toLowerCase().includes(q)
    );
  });

  const buscarCNPJ = async () => {
    const cnpjLimpo = form.cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Digite os 14 dígitos.", variant: "destructive" });
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const d = await res.json();
      setForm((f: any) => ({
        ...f,
        razao_social: d.razao_social ?? "",
        nome_fantasia: d.nome_fantasia ?? "",
        email: d.email ?? f.email,
        telefone: d.ddd_telefone_1 ?? f.telefone,
        cep: d.cep ?? "",
        logradouro: d.logradouro ?? "",
        numero: d.numero ?? "",
        complemento: d.complemento ?? "",
        bairro: d.bairro ?? "",
        cidade: d.municipio ?? "",
        uf: d.uf ?? "",
      }));
      toast({ title: "Dados carregados!", description: d.razao_social });
    } catch (e: any) {
      toast({ title: "Erro ao buscar CNPJ", description: e.message, variant: "destructive" });
    } finally {
      setBuscando(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditingId(c.id);
    setForm({ ...emptyForm, ...c });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Cliente atualizado!" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Cliente cadastrado!" });
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
      toast({ title: "Cliente removido" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleAtivo = async (c: Cliente) => {
    try {
      await updateMutation.mutateAsync({ id: c.id, ativo: !c.ativo });
      toast({ title: c.ativo ? "Cliente inativado" : "Cliente ativado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" /> Lista de Clientes
            </h1>
            <p className="text-sm text-muted-foreground">Home › Lista de Clientes</p>
          </div>
          {canEdit && (
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Clientes</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((c) => (
                  <Card key={c.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium uppercase break-words">{c.razao_social}</p>
                          {c.nome_fantasia && (
                            <p className="text-xs text-muted-foreground break-words">{c.nome_fantasia}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{c.cnpj}</p>
                          <p className="text-xs text-muted-foreground">{c.cidade ? `${c.cidade}/${c.uf}` : "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          onClick={() => handleToggleAtivo(c)}
                          className={
                            c.ativo
                              ? "bg-success text-success-foreground hover:bg-success/90 h-7 px-3"
                              : "bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 px-3"
                          }
                        >
                          {c.ativo ? "ATIVO" : "INATIVO"}
                        </Button>
                        {canEdit && (
                          <div className="flex gap-1.5">
                            <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8" onClick={() => openEdit(c)} title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 w-8" onClick={() => setDeleteId(c.id)} title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
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
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium uppercase">
                          {c.razao_social}
                          {c.nome_fantasia && (
                            <p className="text-xs text-muted-foreground normal-case">{c.nome_fantasia}</p>
                          )}
                        </TableCell>
                        <TableCell>{c.cnpj}</TableCell>
                        <TableCell>{c.cidade ? `${c.cidade}/${c.uf}` : "—"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleToggleAtivo(c)}
                            className={
                              c.ativo
                                ? "bg-success text-success-foreground hover:bg-success/90 h-7 px-3"
                                : "bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 px-3"
                            }
                          >
                            {c.ativo ? "ATIVO" : "INATIVO"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <div className="flex justify-end gap-1.5">
                              <Button variant="ghost" size="icon" className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8" onClick={() => openEdit(c)} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-8 w-8" onClick={() => setDeleteId(c.id)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            <div className="sm:col-span-2">
              <Label>CNPJ *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <Button type="button" onClick={buscarCNPJ} disabled={buscando} className="bg-info text-info-foreground hover:bg-info/90 whitespace-nowrap">
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Buscar</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Os outros campos são preenchidos automaticamente.</p>
            </div>
            <div className="sm:col-span-2">
              <Label>Razão Social *</Label>
              <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={form.uf} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.cnpj || !form.razao_social} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
