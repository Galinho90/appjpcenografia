import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, Truck, Power, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useFornecedores, useCreateFornecedor, useUpdateFornecedor, useDeleteFornecedor,
  useCategoriasFinanceiras, type Fornecedor,
} from "@/hooks/useFinanceiro";

const emptyForm = {
  nome: "",
  tipo_documento: "cnpj",
  documento: "",
  email: "",
  telefone: "",
  contato: "",
  chave_pix: "",
  banco: "",
  agencia: "",
  conta: "",
  categoria_padrao_id: "",
  observacoes: "",
  ativo: true,
};

export default function Fornecedores() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const { data: fornecedores = [], isLoading } = useFornecedores();
  const { data: categorias = [] } = useCategoriasFinanceiras();

  const createMutation = useCreateFornecedor();
  const updateMutation = useUpdateFornecedor();
  const deleteMutation = useDeleteFornecedor();

  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  const buscarCnpj = async () => {
    const cnpj = onlyDigits(form.documento);
    if (cnpj.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Informe 14 dígitos.", variant: "destructive" });
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const d = await res.json();
      setForm((f) => ({
        ...f,
        nome: d.razao_social || d.nome_fantasia || f.nome,
        email: d.email || f.email,
        telefone: d.ddd_telefone_1 || f.telefone,
        observacoes: [
          d.logradouro && `${d.logradouro}, ${d.numero || "S/N"}${d.complemento ? " - " + d.complemento : ""}`,
          d.bairro,
          d.municipio && `${d.municipio}/${d.uf}`,
          d.cep && `CEP ${d.cep}`,
        ].filter(Boolean).join(" - ") || f.observacoes,
      }));
      toast({ title: "Dados preenchidos" });
    } catch (e: any) {
      toast({ title: "Erro ao buscar CNPJ", description: e.message, variant: "destructive" });
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const categoriasDespesa = categorias.filter((c) => c.tipo === "despesa");

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return fornecedores;
    return fornecedores.filter((f) =>
      [f.nome, f.documento, f.email, f.contato]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [fornecedores, busca]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (f: Fornecedor) => {
    setEditingId(f.id);
    setForm({
      nome: f.nome,
      tipo_documento: f.tipo_documento || "cnpj",
      documento: f.documento ?? "",
      email: f.email ?? "",
      telefone: f.telefone ?? "",
      contato: f.contato ?? "",
      chave_pix: f.chave_pix ?? "",
      banco: f.banco ?? "",
      agencia: f.agencia ?? "",
      conta: f.conta ?? "",
      categoria_padrao_id: f.categoria_padrao_id ?? "",
      observacoes: f.observacoes ?? "",
      ativo: f.ativo,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Informe o nome do fornecedor", variant: "destructive" });
      return;
    }
    const payload: any = {
      ...form,
      documento: form.documento || null,
      email: form.email || null,
      telefone: form.telefone || null,
      contato: form.contato || null,
      chave_pix: form.chave_pix || null,
      banco: form.banco || null,
      agencia: form.agencia || null,
      conta: form.conta || null,
      categoria_padrao_id: form.categoria_padrao_id || null,
      observacoes: form.observacoes || null,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Fornecedor atualizado" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Fornecedor cadastrado" });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Fornecedor excluído" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const toggleAtivo = async (f: Fornecedor) => {
    try {
      await updateMutation.mutateAsync({ id: f.id, ativo: !f.ativo });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-7 w-7 text-secondary" /> Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground">Cadastro de quem recebe os pagamentos</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo fornecedor
          </Button>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" /> Buscar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Nome, documento, e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Nenhum fornecedor encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Chave PIX</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell className="text-xs">
                        {f.documento ? (
                          <span><span className="uppercase text-muted-foreground mr-1">{f.tipo_documento}</span>{f.documento}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {f.contato || f.email || f.telefone || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{f.chave_pix || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={f.ativo ? "default" : "outline"} className="text-[10px]">
                          {f.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => toggleAtivo(f)} title={f.ativo ? "Desativar" : "Ativar"}>
                              <Power className={`h-4 w-4 ${f.ativo ? "text-success" : "text-muted-foreground"}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(f.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Novo"} fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome / Razão social *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Tipo doc.</Label>
                <Select value={form.tipo_documento} onValueChange={(v) => setForm({ ...form, tipo_documento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Documento</Label>
                <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Pessoa de contato</Label>
              <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria padrão (despesa)</Label>
              <Select value={form.categoria_padrao_id || "none"} onValueChange={(v) => setForm({ ...form, categoria_padrao_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categoriasDespesa.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="text-sm font-medium text-muted-foreground">Dados bancários</div>
              <div className="space-y-1.5">
                <Label>Chave PIX</Label>
                <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
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
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <Label htmlFor="ativo">Ativo</Label>
              <Switch id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
            <AlertDialogDescription>Movimentações vinculadas continuarão existindo, mas perderão a referência ao fornecedor.</AlertDialogDescription>
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
