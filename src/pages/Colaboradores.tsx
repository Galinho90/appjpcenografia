import { useState } from "react";
import * as XLSX from "xlsx";
import { Plus, Search, Edit, Trash2, Eye, FileSpreadsheet } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useColaboradores, useCreateColaborador, useDeleteColaborador, useUpdateColaborador,
} from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Colaborador } from "@/types";

const emptyForm = {
  nome: "", cpf: "", telefone: "", funcao: "",
  valor_diaria_padrao: 0, chave_pix: "", banco: "", agencia: "", conta: "",
  ativo: true,
};

export default function Colaboradores() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ativos" | "inativos" | "ambos">("ativos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "view">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: colaboradores = [], isLoading } = useColaboradores();
  const createMutation = useCreateColaborador();
  const updateMutation = useUpdateColaborador();
  const deleteMutation = useDeleteColaborador();

  const [form, setForm] = useState(emptyForm);

  const filtered = colaboradores.filter((c) => {
    if (statusFilter === "ativos" && !c.ativo) return false;
    if (statusFilter === "inativos" && c.ativo) return false;
    const q = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.funcao.toLowerCase().includes(q) ||
      c.cpf.toLowerCase().includes(q) ||
      (c.telefone ?? "").toLowerCase().includes(q)
    );
  });

  const handleExportExcel = () => {
    const rows = filtered.map((c) => ({
      Nome: c.nome,
      Celular: c.telefone ?? "",
      CPF: c.cpf,
      Função: c.funcao,
      "Valor Diária": Number(c.valor_diaria_padrao),
      Status: c.ativo ? "Ativo" : "Inativo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Diaristas");
    XLSX.writeFile(wb, `diaristas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openView = (c: Colaborador) => {
    setMode("view");
    setEditingId(c.id);
    setForm({ ...emptyForm, ...c });
    setDialogOpen(true);
  };

  const openEdit = (c: Colaborador) => {
    setMode("edit");
    setEditingId(c.id);
    setForm({ ...emptyForm, ...c });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (mode === "edit" && editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form });
        toast({ title: "Colaborador atualizado!" });
      } else {
        await createMutation.mutateAsync(form);
        toast({ title: "Colaborador cadastrado com sucesso!" });
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
      toast({ title: "Colaborador removido" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const readOnly = mode === "view";
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Diaristas</h1>
          <p className="text-muted-foreground">Gerencie seus diaristas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Novo Diarista</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {mode === "create" ? "Cadastrar Diarista" : mode === "edit" ? "Editar Diarista" : "Detalhes do Diarista"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input disabled={readOnly} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input disabled={readOnly} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input disabled={readOnly} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Input disabled={readOnly} value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} placeholder="Montador, Eletricista..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Diária Padrão</Label>
                  <Input disabled={readOnly} type="number" value={form.valor_diaria_padrao || ""} onChange={(e) => setForm({ ...form, valor_diaria_padrao: Number(e.target.value) })} placeholder="200" />
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input disabled={readOnly} value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} placeholder="CPF, email ou telefone" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input disabled={readOnly} value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="Inter" />
                </div>
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input disabled={readOnly} value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} placeholder="0001" />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Input disabled={readOnly} value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} placeholder="12345-6" />
                </div>
              </div>
              {mode !== "create" && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Ativo</Label>
                  <Switch disabled={readOnly} checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                </div>
              )}
              {!readOnly && (
                <Button className="w-full mt-2" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : mode === "edit" ? "Atualizar" : "Salvar Diarista"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button onClick={handleExportExcel} className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                <FileSpreadsheet className="h-4 w-4" /> Exportar para Excel
              </Button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Mostrar:</span>
                <RadioGroup
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as "ativos" | "inativos" | "ambos")}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="ativos" id="f-ativos" />
                    <Label htmlFor="f-ativos" className="cursor-pointer">Ativos</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="inativos" id="f-inativos" />
                    <Label htmlFor="f-inativos" className="cursor-pointer">Inativos</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="ambos" id="f-ambos" />
                    <Label htmlFor="f-ambos" className="cursor-pointer">Ambos</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Valor Diária</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.cpf}</TableCell>
                    <TableCell>{c.funcao}</TableCell>
                    <TableCell>R$ {c.valor_diaria_padrao.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant={c.ativo ? "default" : "secondary"}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openView(c)} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir diarista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O diarista será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
