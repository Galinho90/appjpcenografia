import { useState, useMemo, useEffect, Fragment } from "react";
import { Plus, Pencil, Trash2, Filter, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, CircleDot, GripVertical, Upload, Search, X, ChevronDown, Wallet, Clock, TrendingUp, TrendingDown, FileText } from "lucide-react";
import ImportarOFXDialog from "@/components/financeiro/ImportarOFXDialog";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  useContasBancarias, useCategoriasFinanceiras, useFornecedores, useSaldosPorDia,
  type MovimentacaoFinanceira, type TipoMovimentacao, type StatusMovimentacao,
} from "@/hooks/useFinanceiro";
import { fmtBRL, fmtDate, statusColor, statusLabel, todayISO } from "@/lib/financeiro";
import { useClientes } from "@/hooks/useSupabaseData";
import { useRegistrarMotivoAjuste } from "@/hooks/useAuditoria";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { cn } from "@/lib/utils";

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
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [filters, setFilters] = useState({
    tipo: "all" as TipoMovimentacao | "all",
    status: "all" as StatusMovimentacao | "all",
    categoriaId: "all",
    contaId: "all",
    dataInicio: "",
    dataFim: "",
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
  const [ofxOpen, setOfxOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [valorOriginal, setValorOriginal] = useState<number | null>(null);
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const registrarMotivo = useRegistrarMotivoAjuste();

  // Estado derivado: houve alteração de valor em um registro existente?
  const valorAlterado =
    !!editingId &&
    valorOriginal !== null &&
    Math.abs(Number(form.valor || 0) - valorOriginal) > 0.004;

  useEffect(() => { setPage(1); }, [filters, pageSize, search]);

  /** Busca textual local (descrição, fornecedor, cliente, categoria, conta). */
  const filteredMovs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return movs;
    return movs.filter((m) =>
      [
        m.descricao,
        m.fornecedor?.nome,
        m.cliente?.razao_social,
        m.categoria?.nome,
        m.conta?.apelido,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [movs, search]);

  /** Totais do resultado filtrado — visão rápida do período. */
  const resumo = useMemo(() => {
    let entradas = 0, saidas = 0, pendentes = 0, qtdPendentes = 0;
    for (const m of filteredMovs) {
      const v = Number(m.valor) || 0;
      if (m.tipo === "entrada") entradas += v;
      else if (m.tipo === "saida") saidas += v;
      if (m.status !== "pago" && m.status !== "cancelado") { pendentes += v; qtdPendentes++; }
    }
    return { entradas, saidas, saldo: entradas - saidas, pendentes, qtdPendentes };
  }, [filteredMovs]);

  const totalPages = Math.max(1, Math.ceil(filteredMovs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedMovs = useMemo(
    () => filteredMovs.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredMovs, currentPage, pageSize]
  );

  /** Agrupamento por data efetiva (pagamento quando pago, senão vencimento). */
  const grupos = useMemo(() => {
    const effDate = (m: MovimentacaoFinanceira) =>
      ((m.status === "pago" ? m.data_pagamento : m.data_vencimento) ?? "") as string;
    const out: { data: string; itens: MovimentacaoFinanceira[]; total: number }[] = [];
    for (const m of pagedMovs) {
      const d = effDate(m);
      let g = out[out.length - 1];
      if (!g || g.data !== d) { g = { data: d, itens: [], total: 0 }; out.push(g); }
      g.itens.push(m);
      const v = Number(m.valor) || 0;
      g.total += m.tipo === "entrada" ? v : m.tipo === "saida" ? -v : 0;
    }
    return out;
  }, [pagedMovs]);

  /** Saldo de fechamento de cada dia (conforme extrato bancário). */
  const { data: saldosPorDia } = useSaldosPorDia(filters.contaId);
  const saldoDoDia = (data: string): number | null => {
    if (!data || !saldosPorDia) return null;
    const exato = saldosPorDia.get(data);
    if (exato != null) return exato;
    // Dia sem movimentação paga: repete o saldo do último dia com fechamento.
    let ultimo: number | null = null;
    for (const [dia, saldo] of [...saldosPorDia.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (dia <= data) ultimo = saldo;
      else break;
    }
    return ultimo;
  };

  /** Saldo atual da conta (ou de todas), na data final do filtro ou hoje. */
  const saldoContaRef = useMemo(() => {
    const hojeIso = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    return filters.dataFim || hojeIso;
  }, [filters.dataFim]);
  const saldoConta = saldoDoDia(saldoContaRef);
  const contaLabel =
    filters.contaId === "all"
      ? "Todas as contas"
      : contas.find((c) => c.id === filters.contaId)?.apelido ?? "Conta";


  const activeFiltersCount =
    (filters.tipo !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.contaId !== "all" ? 1 : 0) +
    (filters.categoriaId !== "all" ? 1 : 0) +
    (filters.dataInicio ? 1 : 0) +
    (filters.dataFim ? 1 : 0);

  /** Presets de período — reduz cliques no caso de uso mais comum. */
  const setPeriodoPreset = (preset: "hoje" | "7d" | "mes" | "quinzena" | "tudo") => {
    const hoje = new Date(todayISO() + "T12:00:00");
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "tudo") { setFilters({ ...filters, dataInicio: "", dataFim: "" }); return; }
    if (preset === "hoje") { setFilters({ ...filters, dataInicio: iso(hoje), dataFim: iso(hoje) }); return; }
    if (preset === "7d") {
      const ini = new Date(hoje); ini.setDate(ini.getDate() - 6);
      setFilters({ ...filters, dataInicio: iso(ini), dataFim: iso(hoje) }); return;
    }
    if (preset === "mes") {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 12);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 12);
      setFilters({ ...filters, dataInicio: iso(ini), dataFim: iso(fim) }); return;
    }
    // quinzena vigente: 01–15 ou 16–fim do mês
    const dia = hoje.getDate();
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), dia <= 15 ? 1 : 16, 12);
    const fim = dia <= 15
      ? new Date(hoje.getFullYear(), hoje.getMonth(), 15, 12)
      : new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 12);
    setFilters({ ...filters, dataInicio: iso(ini), dataFim: iso(fim) });
  };

  const openCreate = (tipo: TipoMovimentacao = "saida") => {
    setEditingId(null);
    setValorOriginal(null);
    setMotivoAjuste("");
    setForm({ ...emptyForm, tipo, conta_id: contas[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (m: MovimentacaoFinanceira) => {
    setEditingId(m.id);
    setValorOriginal(Number(m.valor) || 0);
    setMotivoAjuste("");
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
    // Ajuste manual de valor exige justificativa para a trilha de auditoria.
    if (valorAlterado && !motivoAjuste.trim()) {
      toast({ title: "Informe o motivo do ajuste de valor", variant: "destructive" });
      return;
    }
    const payload: any = {
      tipo: form.tipo,
      conta_id: form.conta_id,
      conta_destino_id: form.tipo === "transferencia" ? form.conta_destino_id : null,
      categoria_id: form.tipo === "transferencia" ? null : (form.categoria_id || null),
      fornecedor_id: form.tipo === "saida" ? (form.fornecedor_id || null) : null,
      cliente_id: form.tipo === "entrada" ? (form.cliente_id || null) : null,
      valor: Number(form.valor),
      data_vencimento: form.data_vencimento || null,
      data_pagamento: form.status === "pago" ? (form.data_pagamento || todayISO()) : (form.data_pagamento || null),
      status: form.status,
      descricao: form.descricao,
      observacoes: form.observacoes || null,
    };
    try {
      if (editingId) {
        const precisaMotivo = valorAlterado;
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        if (precisaMotivo) {
          try {
            await registrarMotivo.mutateAsync({
              tabela: "movimentacoes_financeiras",
              registroId: editingId,
              motivo: motivoAjuste,
            });
          } catch (err: any) {
            // O ajuste já foi salvo e auditado; apenas o motivo falhou.
            toast({
              title: "Motivo não registrado",
              description: err?.message ?? "Tente registrar o motivo novamente.",
              variant: "destructive",
            });
          }
        }
        toast({ title: "Movimentação atualizada" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Movimentação criada" });
      }
      setDialogOpen(false);
      setMotivoAjuste("");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };


  const deleteOrigemFechamento =
    !!deleteId && pagedMovs.some((m) => m.id === deleteId && m.origem === "fechamento");

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

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pagedMovs.findIndex((m) => m.id === active.id);
    const newIndex = pagedMovs.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const effDate = (m: any) => (m.status === "pago" ? m.data_pagamento : m.data_vencimento) ?? "";
    const activeMov = pagedMovs[oldIndex];
    const overMov = pagedMovs[newIndex];
    if (effDate(activeMov) !== effDate(overMov)) {
      toast({ title: "Reordenação bloqueada", description: "Só é possível reordenar itens da mesma data.", variant: "destructive" });
      return;
    }
    const reordered = arrayMove(pagedMovs, oldIndex, newIndex);
    // Renumera apenas os itens da mesma data
    const sameDate = reordered.filter((m) => effDate(m) === effDate(activeMov));
    const updates = sameDate.map((m, i) => ({ id: m.id, ordem_manual: i + 1 }));
    const orderMap = new Map(updates.map((u) => [u.id, u.ordem_manual]));

    // Optimistic cache update
    qc.setQueryData(["movimentacoes_financeiras", filters], (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      const next = prev.map((m: any) =>
        orderMap.has(m.id) ? { ...m, ordem_manual: orderMap.get(m.id) } : m
      );
      return [...next].sort((a: any, b: any) => {
        const dA = (a.status === "pago" ? a.data_pagamento : a.data_vencimento) ?? "";
        const dB = (b.status === "pago" ? b.data_pagamento : b.data_vencimento) ?? "";
        if (dA !== dB) return dB.localeCompare(dA);
        const oA = a.ordem_manual, oB = b.ordem_manual;
        if (oA != null && oB != null && oA !== oB) return oA - oB;
        if (oA == null && oB != null) return -1;
        if (oA != null && oB == null) return 1;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      });
    });

    try {
      await Promise.all(
        updates.map((u) =>
          supabase.from("movimentacoes_financeiras" as any)
            .update({ ordem_manual: u.ordem_manual } as any)
            .eq("id", u.id)
        )
      );
    } catch (err: any) {
      toast({ title: "Erro ao reordenar", description: err.message, variant: "destructive" });
    }
    qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] });
  };


  const tipoIcon = (t: TipoMovimentacao) =>
    t === "entrada" ? <ArrowDownCircle className="h-4 w-4 text-success" /> :
    t === "saida" ? <ArrowUpCircle className="h-4 w-4 text-destructive" /> :
    <ArrowLeftRight className="h-4 w-4 text-info" />;

  const origemBadge = (o: string) => {
    if (o === "fechamento") return <Badge variant="outline" className="text-[10px]">Fechamento</Badge>;
    if (o === "inter_api") return <Badge variant="outline" className="text-[10px]">Inter</Badge>;
    if (o === "ofx") return <Badge variant="outline" className="text-[10px]">OFX</Badge>;
    return null;
  };

  return (
    <div className="space-y-4 md:space-y-6 pt-4 md:pt-6 px-3 sm:px-4 md:px-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Movimentações" description="Entradas, saídas e transferências entre contas" className="px-0" />
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => setOfxOpen(true)} variant="outline" className="h-10 gap-2 border-primary/20 hover:bg-primary/5">
              <Upload className="h-4 w-4" /> Importar OFX
            </Button>
            <div className="h-8 w-px bg-border/50 mx-1 hidden sm:block" />
            <Button onClick={() => openCreate("entrada")} className="h-10 gap-2 flex-1 sm:flex-initial bg-success hover:bg-success/90 text-success-foreground">
              <ArrowDownCircle className="h-4 w-4" /> Entrada
            </Button>
            <Button onClick={() => openCreate("saida")} variant="destructive" className="h-10 gap-2">
              <ArrowUpCircle className="h-4 w-4" /> Saída
            </Button>
            <Button onClick={() => openCreate("transferencia")} variant="outline" className="h-10 gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Transferir
            </Button>
          </div>
        )}
      </div>

      {/* Resumo do resultado filtrado */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Saldo da Conta"
          value={saldoConta != null ? fmtBRL(saldoConta) : "—"}
          icon={Wallet}
          tone={(saldoConta ?? 0) >= 0 ? "primary" : "destructive"}
          hint={`${contaLabel} • ${saldoContaRef.split("-").reverse().join("/")}`}
        />
        <StatCard
          label="Entradas"
          value={fmtBRL(resumo.entradas)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Saídas"
          value={fmtBRL(resumo.saidas)}
          icon={TrendingDown}
          tone="destructive"
        />
        <StatCard
          label="Resultado"
          value={fmtBRL(resumo.saldo)}
          icon={ArrowLeftRight}
          tone={resumo.saldo >= 0 ? "success" : "destructive"}
        />
        <StatCard
          label="A pagar/receber"
          value={fmtBRL(resumo.pendentes)}
          icon={Clock}
          tone="warning"
          hint={`${resumo.qtdPendentes} pendente(s)`}
        />
      </div>

      {/* Barra de busca + período + filtros */}
      <Card className="shadow-premium-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descrição, cliente, fornecedor, categoria ou conta…"
                className="pl-9 pr-8 h-9"
                aria-label="Buscar movimentações"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                ["hoje", "Hoje"], ["7d", "7 dias"], ["quinzena", "Quinzena"], ["mes", "Mês"], ["tudo", "Tudo"],
              ] as const).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setPeriodoPreset(key)}
                >
                  {label}
                </Button>
              ))}
              <Button
                size="sm"
                variant={filtersOpen ? "secondary" : "outline"}
                className="h-8 text-xs gap-1.5"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <Filter className="h-3.5 w-3.5" /> Filtros
                {activeFiltersCount > 0 && (
                  <Badge className="ml-0.5 h-4 px-1.5 text-[10px] border-transparent">{activeFiltersCount}</Badge>
                )}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>

          {filtersOpen && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-border/50 pt-4 mt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Período de</Label>
                <Input
                  type="date" className="h-9"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">até</Label>
                <Input
                  type="date" className="h-9"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select value={filters.tipo} onValueChange={(v: any) => setFilters({ ...filters, tipo: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filters.status} onValueChange={(v: any) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Conta</Label>
                <Select value={filters.contaId} onValueChange={(v) => setFilters({ ...filters, contaId: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as contas</SelectItem>
                    {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select value={filters.categoriaId} onValueChange={(v) => setFilters({ ...filters, categoriaId: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <Button
                  variant="ghost" size="sm" className="h-8 text-xs gap-1.5"
                  onClick={() => setFilters({ tipo: "all", status: "all", categoriaId: "all", contaId: "all", dataInicio: "", dataFim: "" })}
                >
                  <X className="h-3.5 w-3.5" /> Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-premium-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-6">
              {[1, 2, 3].map((g) => (
                <div key={g} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMovs.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Nenhuma movimentação encontrada</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                {search || activeFiltersCount > 0
                  ? "Não encontramos resultados para os filtros aplicados. Tente ajustar sua busca ou limpar os filtros."
                  : "Sua lista de movimentações está vazia. Comece lançando uma nova entrada, saída ou transferência."}
              </p>
              {(search || activeFiltersCount > 0) ? (
                <Button
                  variant="outline" size="sm" className="mt-6 gap-2"
                  onClick={() => {
                    setSearch("");
                    setFilters({ tipo: "all", status: "all", categoriaId: "all", contaId: "all", dataInicio: "", dataFim: "" });
                  }}
                >
                  <X className="h-4 w-4" /> Limpar busca e filtros
                </Button>
              ) : isAdmin && (
                <Button onClick={() => openCreate("saida")} className="mt-6 gap-2">
                  <Plus className="h-4 w-4" /> Novo lançamento
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile: cards agrupados por data */}
              <div className="md:hidden">
                {grupos.map((g) => (
                  <div key={g.data || "sem-data"}>
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/60 sticky top-0 z-10">
                      <span className="text-xs font-semibold">{g.data ? fmtDate(g.data) : "Sem data"}</span>
                      <span className="text-right">
                        <span className="block text-[10px] text-muted-foreground leading-none">Saldo do dia</span>
                        <span className={`text-xs font-semibold ${saldoDoDia(g.data) == null ? "text-muted-foreground" : (saldoDoDia(g.data) as number) >= 0 ? "text-success" : "text-destructive"}`}>
                          {saldoDoDia(g.data) == null ? "—" : fmtBRL(saldoDoDia(g.data) as number)}
                        </span>
                      </span>
                    </div>
                    <div className="divide-y">
                      {g.itens.map((m) => (
                        <div key={m.id} className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="mt-0.5">{tipoIcon(m.tipo)}</div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm break-words">{m.descricao}</div>
                                {m.fornecedor && (
                                  <div className="text-[11px] text-muted-foreground">→ {m.fornecedor.nome}</div>
                                )}
                                {m.cliente && (
                                  <div className="text-[11px] text-muted-foreground">← {m.cliente.razao_social}</div>
                                )}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {m.categoria && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <CircleDot className="h-3 w-3" style={{ color: m.categoria.cor }} />
                                      {m.categoria.nome}
                                    </span>
                                  )}
                                  {origemBadge(m.origem)}
                                </div>
                              </div>
                            </div>
                            <div className={`text-right font-semibold text-sm whitespace-nowrap ${m.tipo === "entrada" ? "text-success" : m.tipo === "saida" ? "text-destructive" : ""}`}>
                              {m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "-" : ""} {fmtBRL(m.valor)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{m.conta?.apelido ?? "—"}</span>
                              <Badge className={`${statusColor[m.status]} text-[10px] px-1.5 py-0 border-transparent`}>
                                {statusLabel[m.status]}
                              </Badge>
                            </div>
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                {m.status !== "pago" && (
                                  <Button variant="ghost" size="sm" onClick={() => marcarPago(m)} className="text-success h-8">
                                    Pagar
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)} aria-label="Editar movimentação">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(m.id)} aria-label="Excluir movimentação">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela agrupada por data */}
              <div className="hidden md:block">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <div className="overflow-x-auto py-1">
                    <Table className="[&_th:first-child]:pl-8 [&_th:last-child]:pr-8 [&_td:first-child]:pl-8 [&_td:last-child]:pr-8 border-separate border-spacing-0">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b bg-muted/20 [&_th]:h-16 [&_th]:py-5 [&_th]:align-middle [&_th]:border-b">

                          {isAdmin && <TableHead className="w-12"></TableHead>}
                          <TableHead className="w-14 text-center">Tipo</TableHead>
                          <TableHead className="min-w-[220px]">Descrição / Origem</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          {isAdmin && <TableHead className="text-right w-36">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grupos.map((g) => (
                          <Fragment key={g.data || "sem-data"}>
                            <TableRow className="bg-muted/30 hover:bg-muted/40 border-y transition-colors">
                              <TableCell colSpan={isAdmin ? 8 : 7} className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-foreground">
                                    {g.data ? fmtDate(g.data) : "Sem data"}
                                  </span>
                                  <div className="h-4 w-px bg-border/60" />
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {g.itens.length} lançamento(s)
                                  </span>
                                  <div className="h-4 w-px bg-border/60" />
                                  <span className="text-xs font-medium">
                                    Movimento: <span className={g.total >= 0 ? "text-success" : "text-destructive"}>{fmtBRL(g.total)}</span>
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none mb-1">Saldo do Dia</span>
                                  <span className={`text-sm font-bold ${saldoDoDia(g.data) == null ? "text-muted-foreground" : (saldoDoDia(g.data) as number) >= 0 ? "text-success" : "text-destructive"}`}>
                                    {saldoDoDia(g.data) == null ? "—" : fmtBRL(saldoDoDia(g.data) as number)}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                            <SortableContext items={g.itens.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                              {g.itens.map((m) => (
                                <SortableMovRow
                                  key={m.id}
                                  m={m}
                                  isAdmin={isAdmin}
                                  tipoIcon={tipoIcon}
                                  origemBadge={origemBadge}
                                  onEdit={openEdit}
                                  onDelete={setDeleteId}
                                  onPagar={marcarPago}
                                />
                              ))}
                            </SortableContext>
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DndContext>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-6 px-4 py-3 border-t">
                <div className="text-xs text-muted-foreground">
                  Mostrando {(currentPage - 1) * pageSize + 1}
                  –{Math.min(currentPage * pageSize, filteredMovs.length)} de {filteredMovs.length}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Por página</Label>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    Anterior
                  </Button>
                  <span className="text-xs whitespace-nowrap">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button variant="outline" size="sm" className="h-8" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                    Próxima
                  </Button>
                </div>
              </div>
            </>
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

            {form.tipo === "entrada" && (
              <div className="space-y-1.5">
                <Label>Cliente (de quem está recebendo)</Label>
                <Select
                  value={form.cliente_id || "none"}
                  onValueChange={(v) => {
                    const id = v === "none" ? "" : v;
                    const c = clientes.find((x) => x.id === id);
                    setForm({
                      ...form,
                      cliente_id: id,
                      descricao: form.descricao || (c ? `Recebimento ${c.razao_social}` : ""),
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
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

            {valorAlterado && (
              <div className="space-y-1.5 rounded-lg border border-accent/40 bg-accent/5 p-3">
                <Label htmlFor="motivo-ajuste">
                  Motivo do ajuste de valor <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="motivo-ajuste"
                  rows={2}
                  placeholder="Ex.: valor corrigido conforme extrato do banco (OFX)"
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor original: {fmtBRL(valorOriginal ?? 0)} — o ajuste será registrado na auditoria com seu usuário e data.
                </p>
              </div>
            )}


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
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
              {deleteOrigemFechamento
                ? " Atenção: esta movimentação foi gerada por um fechamento de diarista. Excluí-la remove apenas o registro financeiro; o fechamento continuará marcado como pago e poderá gerar a movimentação novamente se for editado."
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportarOFXDialog open={ofxOpen} onOpenChange={setOfxOpen} />
    </div>
  );
}

function SortableMovRow({
  m, isAdmin, tipoIcon, origemBadge, onEdit, onDelete, onPagar,
}: {
  m: MovimentacaoFinanceira;
  isAdmin: boolean;
  tipoIcon: (t: TipoMovimentacao) => JSX.Element;
  origemBadge: (o: string) => JSX.Element | null;
  onEdit: (m: MovimentacaoFinanceira) => void;
  onDelete: (id: string) => void;
  onPagar: (m: MovimentacaoFinanceira) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    background: isDragging ? "hsl(var(--muted))" : undefined,
  };
  return (
    <TableRow ref={setNodeRef} style={style} className="h-20">
      {isAdmin && (
        <TableCell className="w-8 p-1">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
            aria-label="Arrastar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </TableCell>
      )}
      <TableCell className="text-center">{tipoIcon(m.tipo)}</TableCell>
      <TableCell className="py-5 align-middle">
        <div className="flex flex-col gap-1.5 justify-center">
          <span className="font-semibold text-sm text-foreground leading-tight">{m.descricao}</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {m.fornecedor && (
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <ArrowUpCircle className="h-2.5 w-2.5 rotate-45" /> {m.fornecedor.nome}
              </span>
            )}
            {m.cliente && (
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <ArrowDownCircle className="h-2.5 w-2.5 -rotate-45" /> {m.cliente.razao_social}
              </span>
            )}
            {m.origem && origemBadge(m.origem)}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {m.categoria ? (
          <Badge variant="outline" className="h-6 border-muted bg-muted/20 gap-1.5 px-2 text-[11px] font-medium">
            <CircleDot className="h-2.5 w-2.5" style={{ color: m.categoria.cor }} />
            {m.categoria.nome}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">{m.conta?.apelido ?? "—"}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">
            {m.status === "pago" && m.data_pagamento ? fmtDate(m.data_pagamento) : fmtDate(m.data_vencimento)}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
            {m.status === "pago" ? "Efetivado" : "Previsto"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={cn("text-[10px] px-2 py-0.5 border-none font-bold uppercase tracking-wider shadow-sm", statusColor[m.status])}>
          {statusLabel[m.status]}
        </Badge>
      </TableCell>
      <TableCell className={cn("text-right font-bold text-base", m.tipo === "entrada" ? "text-success" : m.tipo === "saida" ? "text-destructive" : "text-info")}>
        <span className="text-xs font-medium mr-0.5 opacity-70">R$</span>
        {Number(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      {isAdmin && (
        <TableCell className="text-right py-4">
          <div className="flex justify-end items-center gap-1">
            {m.status !== "pago" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onPagar(m)} 
                className="h-8 text-success hover:text-success hover:bg-success/10 font-bold text-xs px-2"
              >
                PAGAR
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(m)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(m.id)} aria-label="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
