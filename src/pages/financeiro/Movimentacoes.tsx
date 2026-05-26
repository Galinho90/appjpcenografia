import { useState } from "react";
import { Plus, Pencil, Trash2, Filter, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, CircleDot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useMovimentacoes, useCreateMovimentacao, useUpdateMovimentacao, useDeleteMovimentacao,
  useContasBancarias, useCategoriasFinanceiras, useFornecedores,
  type MovimentacaoFinanceira, type TipoMovimentacao, type StatusMovimentacao,
} from "@/hooks/useFinanceiro";
import { fmtBRL, fmtDate, statusColor, statusLabel, todayISO } from "@/lib/financeiro";
import { useClientes } from "@/hooks/useSupabaseData";

const emptyForm = {
  tipo: "saida" as TipoMovimentacao,
  conta_id: "",
  conta_destino_id: "",
  categoria_id: "",
  fornecedor_id: "",
  cliente_id: "",
  valor: "",
  data_vencimento: todayISO(),
  data_pagamento: "",
  status: "pendente" as StatusMovimentacao,
  descricao: "",
  observacoes: "",
};

export default function Movimentacoes() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [filters, setFilters] = useState({
    tipo: "all" as TipoMovimentacao | "all",
    status: "all" as StatusMovimentacao | "all",
    categoriaId: "all",
    contaId: "all",
  });
  const { data: movs = [], isLoading } = useMovimentacoes(filters);
  const { data: contas = [] } = useContasBancarias();
  const { data: categorias = [] } = useCategoriasFinanceiras();
  const { data: fornecedores = [] } = useFornecedores(true);
  const { data: clientes = [] } = useClientes();

  const createMutation = useCreateMovimentacao();
  const updateMutation = useUpdateMovimentacao();
  const deleteMutation = useDeleteMovimentacao();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = (tipo: TipoMovimentacao = "saida") => {
    setEditingId(null);
    setForm({ ...emptyForm, tipo, conta_id: contas[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (m: MovimentacaoFinanceira) => {
    setEditingId(m.id);
    setForm({
      tipo: m.tipo,
      conta_id: m.conta_id,
      conta_destino_id: m.conta_destino_id ?? "",
      categoria_id: m.categoria_id ?? "",
      fornecedor_id: m.fornecedor_id ?? "",
      cliente_id: m.cliente_id ?? "",
      valor: String(m.valor),
      data_vencimento: m.data_vencimento ?? todayISO(),
      data_pagamento: m.data_pagamento ?? "",
      status: m.status,
      descricao: m.descricao,
      observacoes: m.observacoes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.descricao.trim() || !form.valor || !form.conta_id) {
      toast({ title: "Preencha conta, descrição e valor", variant: "destructive" });
      return;
    }
    if (form.tipo === "transferencia" && !form.conta_destino_id) {
      toast({ title: "Selecione a conta de destino", variant: "destructive" });
      return;
    }
    const payload: any = {
      tipo: form.tipo,
      conta_id: form.conta_id,
      conta_destino_id: form.tipo === "transferencia" ? form.conta_destino_id : null,
      categoria_id: form.tipo === "transferencia" ? null : (form.categoria_id || null),
      fornecedor_id: form.tipo === "saida" ? (form.fornecedor_id || null) : null,
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento || null,
      data_pagamento: form.status === "pago" ? (form.data_pagamento || todayISO()) : (form.data_pagamento || null),
      status: form.status,
      descricao: form.descricao,
      observacoes: form.observacoes || null,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Movimentação atualizada" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Movimentação criada" });
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
      toast({ title: "Movimentação excluída" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const marcarPago = async (m: MovimentacaoFinanceira) => {
    try {
      await updateMutation.mutateAsync({
        id: m.id,
        status: "pago",
        data_pagamento: m.data_pagamento ?? todayISO(),
      });
      toast({ title: "Marcado como pago" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const categoriasFiltradas = categorias.filter((c) =>
    form.tipo === "entrada" ? c.tipo === "receita" : c.tipo === "despesa"
  );

  const tipoIcon = (t: TipoMovimentacao) =>
    t === "entrada" ? <ArrowDownCircle className="h-4 w-4 text-success" /> :
    t === "saida" ? <ArrowUpCircle className="h-4 w-4 text-destructive" /> :
    <ArrowLeftRight className="h-4 w-4 text-info" />;

  const origemBadge = (o: string) => {
    if (o === "fechamento") return <Badge variant="outline" className="text-[10px]">Fechamento</Badge>;
    if (o === "inter_api") return <Badge variant="outline" className="text-[10px]">Inter</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Movimentações</h1>
          <p className="text-sm text-muted-foreground">Entradas, saídas e transferências entre contas</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => openCreate("entrada")} className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
              <ArrowDownCircle className="h-4 w-4" /> Entrada
            </Button>
            <Button onClick={() => openCreate("saida")} variant="destructive" className="gap-2">
              <ArrowUpCircle className="h-4 w-4" /> Saída
            </Button>
            <Button onClick={() => openCreate("transferencia")} variant="outline" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Transferência
            </Button>
          </div>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Select value={filters.tipo} onValueChange={(v: any) => setFilters({ ...filters, tipo: v })}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v: any) => setFilters({ ...filters, status: v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.contaId} onValueChange={(v) => setFilters({ ...filters, contaId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.categoriaId} onValueChange={(v) => setFilters({ ...filters, categoriaId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : movs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">Nenhuma movimentação encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movs.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{tipoIcon(m.tipo)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{m.descricao}</div>
                        {m.fornecedor && (
                          <div className="text-[11px] text-muted-foreground">→ {m.fornecedor.nome}</div>
                        )}
                        <div className="flex gap-1 mt-0.5">{origemBadge(m.origem)}</div>
                      </TableCell>
                      <TableCell>
                        {m.categoria ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <CircleDot className="h-3 w-3" style={{ color: m.categoria.cor }} />
                            {m.categoria.nome}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{m.conta?.apelido ?? "—"}</TableCell>
                      <TableCell className="text-xs">{fmtDate(m.data_vencimento)}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColor[m.status]} text-[10px] px-1.5 py-0 border-transparent hover:opacity-90`}>
                          {statusLabel[m.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${m.tipo === "entrada" ? "text-success" : m.tipo === "saida" ? "text-destructive" : ""}`}>
                        {m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "-" : ""} {fmtBRL(m.valor)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {m.status !== "pago" && (
                              <Button variant="ghost" size="sm" onClick={() => marcarPago(m)} className="text-success">
                                Pagar
                              </Button>
                            )}
                            {m.origem !== "fechamento" && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar" : "Nova"} {form.tipo === "entrada" ? "Entrada" : form.tipo === "saida" ? "Saída" : "Transferência"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v, categoria_id: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{form.tipo === "transferencia" ? "Conta origem" : "Conta"}</Label>
                <Select value={form.conta_id} onValueChange={(v) => setForm({ ...form, conta_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.tipo === "transferencia" ? (
                <div className="space-y-1.5">
                  <Label>Conta destino</Label>
                  <Select value={form.conta_destino_id} onValueChange={(v) => setForm({ ...form, conta_destino_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {contas.filter((c) => c.id !== form.conta_id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categoriasFiltradas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {form.tipo === "saida" && (
              <div className="space-y-1.5">
                <Label>Fornecedor (para quem está pagando)</Label>
                <Select
                  value={form.fornecedor_id || "none"}
                  onValueChange={(v) => {
                    const id = v === "none" ? "" : v;
                    const f = fornecedores.find((x) => x.id === id);
                    setForm({
                      ...form,
                      fornecedor_id: id,
                      categoria_id: form.categoria_id || (f?.categoria_padrao_id ?? ""),
                      descricao: form.descricao || (f ? `Pagamento ${f.nome}` : ""),
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}


            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.status === "pago" && (
              <div className="space-y-1.5">
                <Label>Data do pagamento</Label>
                <Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
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
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
