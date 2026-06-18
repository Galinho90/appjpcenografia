import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Trash2, Pencil, Check, ChevronsUpDown, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, DollarSign, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useColaboradores,
  useCategorias,
  useClientes,
  useLancamentos,
  useCreateLancamento,
  useUpdateLancamento,
  useDeleteLancamento,
} from "@/hooks/useSupabaseData";
import { useCreateMovimentacao } from "@/hooks/useFinanceiro";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDateBR } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

const emptyForm = {
  colaborador_id: "",
  categoria_id: "",
  cliente_id: "",
  data: "",
  hora_entrada: "",
  hora_saida: "",
  valor: 0,
  descricao: "",
};

function getQuinzena(ref: Date) {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const isFirst = ref.getDate() <= 15;
  const inicio = new Date(year, month, isFirst ? 1 : 16);
  const fim = isFirst ? new Date(year, month, 15) : new Date(year, month + 1, 0);
  return { inicio, fim, isFirst };
}
function shiftQuinzena(ref: Date, delta: number) {
  const { inicio, isFirst } = getQuinzena(ref);
  if (delta > 0) {
    return isFirst
      ? new Date(inicio.getFullYear(), inicio.getMonth(), 16)
      : new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
  }
  return isFirst
    ? new Date(inicio.getFullYear(), inicio.getMonth() - 1, 16)
    : new Date(inicio.getFullYear(), inicio.getMonth(), 1);
}
const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function Diarias() {
  const [search, setSearch] = useState("");
  const [filtroColaborador, setFiltroColaborador] = useState<string>("all");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("all");
  const [quinzenaRef, setQuinzenaRef] = useState<Date>(new Date());
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [colabPopoverOpen, setColabPopoverOpen] = useState(false);
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);
  const { toast } = useToast();
  const { canEdit } = usePermissions();

  const { inicio: qInicio, fim: qFim } = useMemo(() => getQuinzena(quinzenaRef), [quinzenaRef]);
  const qInicioISO = toISO(qInicio);
  const qFimISO = toISO(qFim);
  const inicioEfetivo = dataInicio || qInicioISO;
  const fimEfetivo = dataFim || qFimISO;
  const isCurrentQuinzena = useMemo(() => toISO(getQuinzena(new Date()).inicio) === qInicioISO, [qInicioISO]);

  const { data: lancamentos = [], isLoading } = useLancamentos({
    dataInicio: inicioEfetivo,
    dataFim: fimEfetivo,
    colaboradorId: filtroColaborador,
    categoriaId: filtroCategoria,
  });
  const { data: colaboradores = [] } = useColaboradores();
  const { data: categorias = [] } = useCategorias();
  const { data: clientes = [] } = useClientes();
  const createMutation = useCreateLancamento();
  const updateMutation = useUpdateLancamento();
  const deleteMutation = useDeleteLancamento();

  const [form, setForm] = useState(emptyForm);
  type QueueItem = {
    categoria_id: string;
    categoria_desc: string;
    categoria_tipo: string;
    data: string;
    hora_entrada: string;
    hora_saida: string;
    valor: number;
    descricao: string;
    parcelamento?: "extrato" | "quinzena" | "mes";
    parcelas?: number;
  
  };
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const categoriasAtivas = useMemo(() => categorias.filter((c) => c.ativo), [categorias]);
  const colaboradoresAtivos = useMemo(() => colaboradores.filter((c) => c.ativo), [colaboradores]);
  const categoriaSelecionada = categorias.find((c) => c.id === form.categoria_id);
  const descCat = (categoriaSelecionada?.descricao || "").toUpperCase();
  // Mesmo formulário (com hora entrada/saída) para Diária, Dobra e Hora Extra,
  // exceto quando for "Pagamento de ..." (ex.: Pagamento de Diárias).
  const isPagamento = descCat.includes("PAGAMENTO");
  const usaHorario = !isPagamento && (
    descCat.includes("DIÁRIA") ||
    descCat.includes("DIARIA") ||
    descCat.includes("DOBRA") ||
    descCat.includes("HORA EXTRA") ||
    descCat.includes("HORAS EXTRA")
  );
  const isVale = descCat === "VALE" || descCat.includes("VALE");
  const [valeParcelamento, setValeParcelamento] = useState<"extrato" | "quinzena" | "mes">("extrato");
  const [valeParcelado, setValeParcelado] = useState(false);
  const [valeNumParcelas, setValeNumParcelas] = useState(2);
  const [valeLancarMov, setValeLancarMov] = useState<"sim" | "nao">("sim");
  const createMovimentacao = useCreateMovimentacao();
  const isDiaria = usaHorario;
  const isHoraExtra = !isPagamento && (descCat.includes("HORA EXTRA") || descCat.includes("HORAS EXTRA"));
  const isDiariaOuDobra = !isPagamento && !isHoraExtra && (
    descCat.includes("DIÁRIA") || descCat.includes("DIARIA") || descCat.includes("DOBRA")
  );

  const calcHoras = (entrada: string, saida: string): number => {
    if (!entrada || !saida) return 0;
    const [eh, em] = entrada.split(":").map(Number);
    const [sh, sm] = saida.split(":").map(Number);
    if ([eh, em, sh, sm].some((n) => Number.isNaN(n))) return 0;
    let mins = sh * 60 + sm - (eh * 60 + em);
    if (mins <= 0) mins += 24 * 60;
    return mins / 60;
  };

  const arredondaValor = (valor: number): number => {
    const intPart = Math.floor(valor);
    const decimalPart = valor - intPart;
    if (decimalPart === 0) return valor;
    if (decimalPart <= 0.49) {
      return intPart + 0.50;
    }
    return intPart + 1.00;
  };

  const colaboradorSelecionado = colaboradores.find((c) => c.id === form.colaborador_id);
  const horasHE = isHoraExtra ? calcHoras(form.hora_entrada, form.hora_saida) : 0;

  useEffect(() => {
    if (!isHoraExtra) return;
    const diaria = Number(colaboradorSelecionado?.valor_diaria_padrao ?? 0);
    if (diaria <= 0 || horasHE <= 0) return;
    const bruto = (diaria / 9) * horasHE;
    const novo = arredondaValor(bruto);
    setForm((f) => (f.valor === novo ? f : { ...f, valor: novo }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHoraExtra, colaboradorSelecionado?.valor_diaria_padrao, horasHE]);

  useEffect(() => {
    if (!isDiariaOuDobra) return;
    const diaria = Number(colaboradorSelecionado?.valor_diaria_padrao ?? 0);
    if (diaria <= 0) return;
    setForm((f) => (f.valor === diaria ? f : { ...f, valor: diaria }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDiariaOuDobra, colaboradorSelecionado?.valor_diaria_padrao]);


  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, data: toISO(new Date()) });
    setQueue([]);
    setDialogOpen(true);
  };

  const openEdit = (l: any) => {
    setEditingId(l.id);
    setForm({
      colaborador_id: l.colaborador_id,
      categoria_id: l.categoria_id,
      cliente_id: (l as any).cliente_id || "",
      data: l.data,
      hora_entrada: l.hora_entrada || "",
      hora_saida: l.hora_saida || "",
      valor: Number(l.valor),
      descricao: l.descricao || "",
    });
    setDialogOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Lançamento excluído!" });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const filtered = [...lancamentos].sort((a, b) => {
    if (b.data !== a.data) return b.data.localeCompare(a.data);
    const ca = (a as any).created_at ?? "";
    const cb = (b as any).created_at ?? "";
    if (cb !== ca) return String(cb).localeCompare(String(ca));
    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  }).filter((l) => {
    const nome = l.colaborador?.nome?.toLowerCase() ?? "";
    const cat = l.categoria?.descricao?.toLowerCase() ?? "";
    const desc = l.descricao?.toLowerCase() ?? "";
    const term = search.toLowerCase();
    const matchesSearch = !term || nome.includes(term) || cat.includes(term) || l.data.includes(term) || desc.includes(term);
    const matchesColab = filtroColaborador === "all" || l.colaborador_id === filtroColaborador;
    const matchesCat = filtroCategoria === "all" || l.categoria_id === filtroCategoria;
    const matchesInicio = l.data >= inicioEfetivo;
    const matchesFim = l.data <= fimEfetivo;
    return matchesSearch && matchesColab && matchesCat && matchesInicio && matchesFim;
  });

  const limparFiltros = () => {
    setSearch("");
    setFiltroColaborador("all");
    setFiltroCategoria("all");
    setDataInicio("");
    setDataFim("");
    setQuinzenaRef(new Date());
  };

  const totalCreditos = filtered.filter((l) => l.categoria?.tipo === "C").reduce((s, l) => s + l.valor, 0);
  const totalDebitos = filtered.filter((l) => l.categoria?.tipo === "D").reduce((s, l) => s + l.valor, 0);
  const saldo = totalCreditos - totalDebitos;

  const addToQueue = () => {
    if (!form.categoria_id) {
      toast({ title: "Selecione a categoria antes de adicionar", variant: "destructive" });
      return;
    }
    const cat = categorias.find((c) => c.id === form.categoria_id);
    const isItemVale = (cat?.descricao || "").toUpperCase().includes("VALE");
    setQueue([
      ...queue,
      {
        categoria_id: form.categoria_id,
        categoria_desc: cat?.descricao || "—",
        categoria_tipo: cat?.tipo || "D",
        data: form.data,
        hora_entrada: isDiaria ? form.hora_entrada : "",
        hora_saida: isDiaria ? form.hora_saida : "",
        valor: Number(form.valor) || 0,
        descricao: form.descricao || "",
        parcelamento: isItemVale && valeLancarMov === "sim" ? (valeParcelado ? (valeParcelamento === "extrato" ? "quinzena" : valeParcelamento) : "extrato") : undefined,
        parcelas: isItemVale && valeLancarMov === "sim" && valeParcelado ? Math.max(2, valeNumParcelas) : 1,
      },
    ]);
    setForm({ ...form, categoria_id: "", hora_entrada: "", hora_saida: "", valor: 0, descricao: "" });
  };

  const removeFromQueue = (idx: number) => {
    setQueue(queue.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.colaborador_id || !form.data) {
      toast({ title: "Preencha diarista e data", variant: "destructive" });
      return;
    }

    // Edit mode: single update
    if (editingId) {
      if (!form.categoria_id) {
        toast({ title: "Selecione a categoria", variant: "destructive" });
        return;
      }
      try {
        await updateMutation.mutateAsync({
          id: editingId,
          colaborador_id: form.colaborador_id,
          categoria_id: form.categoria_id,
          cliente_id: form.cliente_id || null,
          data: form.data,
          hora_entrada: isDiaria && form.hora_entrada ? form.hora_entrada : null,
          hora_saida: isDiaria && form.hora_saida ? form.hora_saida : null,
          valor: Number(form.valor) || 0,
          descricao: form.descricao || null,
        } as any);
        toast({ title: "Lançamento atualizado!" });
        setDialogOpen(false);
        setForm(emptyForm);
        setEditingId(null);
      } catch (e: any) {
        toast({ title: "Erro", description: e.message, variant: "destructive" });
      }
      return;
    }

    // Create mode: queue + current form
    const items = [...queue];
    if (form.categoria_id) {
      const cat = categorias.find((c) => c.id === form.categoria_id);
      const isItemVale = (cat?.descricao || "").toUpperCase().includes("VALE");
      items.push({
        categoria_id: form.categoria_id,
        categoria_desc: cat?.descricao || "—",
        categoria_tipo: cat?.tipo || "D",
        data: form.data,
        hora_entrada: isDiaria ? form.hora_entrada : "",
        hora_saida: isDiaria ? form.hora_saida : "",
        valor: Number(form.valor) || 0,
        descricao: form.descricao || "",
        parcelamento: isItemVale && valeLancarMov === "sim" ? (valeParcelado ? (valeParcelamento === "extrato" ? "quinzena" : valeParcelamento) : "extrato") : undefined,
        parcelas: isItemVale && valeLancarMov === "sim" && valeParcelado ? Math.max(2, valeNumParcelas) : 1,
      });
    }
    if (items.length === 0) {
      toast({ title: "Adicione ao menos um lançamento", variant: "destructive" });
      return;
    }
    try {
      // Pré-carrega categoria/conta para vales (apenas se houver algum vale)
      const hasVale = items.some((i) => i.parcelamento);
      let valeCatFinId: string | null = null;
      let contaId: string | null = null;
      if (hasVale) {
        const [{ data: catFin }, { data: conta }] = await Promise.all([
          supabase.from("categorias_financeiras" as any).select("id").eq("nome", "Vales Diaristas").maybeSingle(),
          supabase.from("contas_bancarias" as any).select("id").eq("ativo", true).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        ]);
        valeCatFinId = (catFin as any)?.id ?? null;
        contaId = (conta as any)?.id ?? null;
      }
      const colabNome = colaboradores.find((c) => c.id === form.colaborador_id)?.nome || "diarista";
      for (const it of items) {
        const isParcelado = it.parcelamento === "quinzena" || it.parcelamento === "mes";
        const n = isParcelado ? Math.max(1, it.parcelas || 1) : 1;
        const baseDate = new Date(`${(it.data || form.data)}T00:00:00`);
        const parcValor = Math.round((it.valor / n) * 100) / 100;
        const freqLabel = it.parcelamento === "quinzena" ? "quinzenal" : it.parcelamento === "mes" ? "mensal" : "no extrato";

        // 1) Lançamentos do diarista: 1 se à vista, N parcelas se parcelado
        let firstLancamentoId: string | null = null;
        for (let p = 0; p < n; p++) {
          const dt = new Date(baseDate);
          if (isParcelado) {
            if (it.parcelamento === "quinzena") dt.setDate(dt.getDate() + 15 * p);
            else dt.setMonth(dt.getMonth() + p);
          }
          const valorParcela = n > 1
            ? (p === n - 1 ? Math.round((it.valor - parcValor * (n - 1)) * 100) / 100 : parcValor)
            : it.valor;
          const descParcela = n > 1
            ? `${it.descricao ? it.descricao + " — " : ""}Parcela ${p + 1}/${n} (${freqLabel})`
            : (it.descricao || null);
          const created = await createMutation.mutateAsync({
            colaborador_id: form.colaborador_id,
            categoria_id: it.categoria_id,
            cliente_id: form.cliente_id || null,
            data: toISO(dt),
            hora_entrada: it.hora_entrada || null,
            hora_saida: it.hora_saida || null,
            valor: valorParcela,
            descricao: descParcela,
          } as any);
          if (p === 0) firstLancamentoId = (created as any)?.id ?? null;
        }

        // 2) Movimentação financeira: SEMPRE à vista (valor cheio) quando o vale gerar movimentação
        if (it.parcelamento && contaId) {
          await createMovimentacao.mutateAsync({
            conta_id: contaId,
            categoria_id: valeCatFinId,
            tipo: "saida",
            valor: it.valor,
            data_vencimento: toISO(baseDate),
            status: "pendente",
            descricao: `Vale ${colabNome}${n > 1 ? ` (${n}× ${freqLabel} no extrato do diarista)` : ""}`,
            observacoes: n > 1 ? `Pagamento à vista — diarista recebe em ${n} parcelas ${freqLabel}` : `Pagamento à vista`,
            colaborador_id: form.colaborador_id,
            lancamento_id: firstLancamentoId,
            origem: "manual",
            recorrente: false,
          } as any);
        }
      }

      toast({ title: items.length === 1 ? "Lançamento registrado!" : `${items.length} lançamentos registrados!` });
      setDialogOpen(false);
      setForm(emptyForm);
      setQueue([]);
      setEditingId(null);
      setValeParcelamento("extrato");
      setValeParcelado(false);
      setValeNumParcelas(2);
      setValeLancarMov("sim");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const colabSelecionado = colaboradores.find((c) => c.id === form.colaborador_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Lançamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Controle de lançamentos por categoria</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Card className="shadow-md w-full sm:w-auto">
            <CardContent className="flex items-center gap-2 p-2">
              <Button variant="ghost" size="icon" onClick={() => setQuinzenaRef(shiftQuinzena(quinzenaRef, -1))} aria-label="Quinzena anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 text-center flex-1 sm:min-w-[180px]">
                <p className="text-xs text-muted-foreground">Quinzena</p>
                <p className="text-sm font-semibold whitespace-nowrap">{fmtDate(qInicio)} — {fmtDate(qFim)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setQuinzenaRef(shiftQuinzena(quinzenaRef, 1))} aria-label="Próxima quinzena">
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentQuinzena && (
                <Button variant="outline" size="sm" onClick={() => setQuinzenaRef(new Date())}>Hoje</Button>
              )}
            </CardContent>
          </Card>
          {canEdit && (
            <Button className="gap-2 w-full sm:w-auto" onClick={openCreate}><Plus className="h-4 w-4" /> Registrar Lançamento</Button>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); setQueue([]); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Diarista</Label>
              <Popover open={colabPopoverOpen} onOpenChange={setColabPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {colabSelecionado?.nome || "Selecione..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar diarista..." />
                    <CommandList>
                      <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                      <CommandGroup>
                        {colaboradoresAtivos.map((c) => (
                          <CommandItem key={c.id} value={c.nome} onSelect={() => {
                            setForm({ ...form, colaborador_id: c.id, valor: editingId ? form.valor : (c.valor_diaria_padrao ?? form.valor) });
                            setColabPopoverOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", form.colaborador_id === c.id ? "opacity-100" : "opacity-0")} />
                            {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal min-w-0">
                    {categoriaSelecionada ? (
                      <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                        <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0 border-transparent text-white hover:opacity-90", categoriaSelecionada.tipo === "C" ? "bg-success" : "bg-destructive")}>
                          {categoriaSelecionada.tipo === "C" ? "Crédito" : "Débito"}
                        </Badge>
                        <span className="truncate">{categoriaSelecionada.descricao}</span>
                      </span>
                    ) : "Selecione a categoria..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar categoria..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma encontrada.</CommandEmpty>
                      <CommandGroup>
                        {categoriasAtivas.map((c) => (
                          <CommandItem key={c.id} value={c.descricao} onSelect={() => {
                            setForm({ ...form, categoria_id: c.id });
                            setCatPopoverOpen(false);
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", form.categoria_id === c.id ? "opacity-100" : "opacity-0")} />
                            <Badge className={cn("text-[10px] px-1.5 py-0 mr-2 shrink-0 border-transparent text-white hover:opacity-90", c.tipo === "C" ? "bg-success" : "bg-destructive")}>
                              {c.tipo === "C" ? "Crédito" : "Débito"}
                            </Badge>
                            <span className="truncate">{c.descricao}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {isDiaria ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div className="space-y-2"><Label>Entrada</Label><Input type="time" value={form.hora_entrada} onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })} /></div>
                <div className="space-y-2"><Label>Saída</Label><Input type="time" value={form.hora_saida} onChange={(e) => setForm({ ...form, hora_saida: e.target.value })} /></div>
              </div>
            ) : (
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            )}

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
              {isHoraExtra && horasHE > 0 && (colaboradorSelecionado?.valor_diaria_padrao ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Calculado: diária ÷ 9 × {horasHE.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h
                </p>
              )}
            </div>
            {isVale && !editingId && (
              <div className="space-y-3 rounded-md border border-warning/30 bg-warning/5 p-3">
                <Label className="text-sm font-medium">Lançar nas Movimentações Financeiras?</Label>
                <p className="text-xs text-muted-foreground">Deseja registrar este vale também como saída no financeiro?</p>
                <RadioGroup
                  value={valeLancarMov}
                  onValueChange={(v) => setValeLancarMov(v as "sim" | "nao")}
                  className="gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="vale-mov-sim" />
                    <Label htmlFor="vale-mov-sim" className="font-normal cursor-pointer">Sim, lançar nas movimentações</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="vale-mov-nao" />
                    <Label htmlFor="vale-mov-nao" className="font-normal cursor-pointer">Não, apenas registrar o vale</Label>
                  </div>
                </RadioGroup>

                {valeLancarMov === "sim" && (
                  <div className="space-y-3 pt-3 border-t border-warning/20">
                    <Label className="text-sm font-medium">Pagamento do vale</Label>
                    <RadioGroup
                      value={valeParcelado ? "parcelado" : "avista"}
                      onValueChange={(v) => setValeParcelado(v === "parcelado")}
                      className="gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="avista" id="vale-avista" />
                        <Label htmlFor="vale-avista" className="font-normal cursor-pointer">Descontar no extrato do diarista (sem parcelar)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="parcelado" id="vale-parcelado" />
                        <Label htmlFor="vale-parcelado" className="font-normal cursor-pointer">Parcelar pagamento</Label>
                      </div>
                    </RadioGroup>

                    {valeParcelado && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-warning/20">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nº de parcelas</Label>
                          <Input
                            type="number"
                            min={1}
                            max={36}
                            value={valeNumParcelas}
                            onChange={(e) => setValeNumParcelas(Math.max(1, Number(e.target.value) || 1))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Frequência</Label>
                          <Select value={valeParcelamento === "extrato" ? "quinzena" : valeParcelamento} onValueChange={(v) => setValeParcelamento(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quinzena">Quinzenal</SelectItem>
                              <SelectItem value="mes">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {Number(form.valor) > 0 && (
                          <p className="col-span-2 text-xs text-muted-foreground">
                            {valeNumParcelas}× de R$ {(Number(form.valor) / Math.max(1, valeNumParcelas)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({valeParcelamento === "mes" ? "mensal" : "quinzenal"})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id || "none"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientes.filter((c) => c.ativo).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional..." /></div>

            {!editingId && queue.length > 0 && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Lançamentos a salvar ({queue.length})</p>
                <div className="space-y-1.5">
                  {queue.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded bg-background border px-2 py-1.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0 border-transparent text-white", it.categoria_tipo === "C" ? "bg-success" : "bg-destructive")}>
                          {it.categoria_tipo === "C" ? "C" : "D"}
                        </Badge>
                        <span className="truncate">{it.categoria_desc}</span>
                        {it.data && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateBR(it.data)}</span>
                        )}
                        {(it.hora_entrada || it.hora_saida) && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{it.hora_entrada || "—"}/{it.hora_saida || "—"}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium">R$ {it.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromQueue(idx)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {!editingId && (
                <Button variant="outline" onClick={addToQueue} disabled={isPending} className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar à lista
                </Button>
              )}
              <Button onClick={handleSave} disabled={isPending} className={cn(!editingId ? "" : "sm:col-span-2")}>
                {isPending
                  ? "Salvando..."
                  : editingId
                    ? "Atualizar Lançamento"
                    : queue.length > 0
                      ? `Salvar todos (${queue.length + (form.categoria_id ? 1 : 0)})`
                      : "Salvar Lançamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-foreground/80">Total de Lançamentos</p>
                <p className="text-2xl font-bold text-primary-foreground">R$ {totalCreditos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <CalendarDays className="h-10 w-10 text-primary-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-accent-foreground/80">Saldo a Pagar</p>
                <p className="text-2xl font-bold text-accent-foreground">R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-10 w-10 text-accent-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-info to-info/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-info-foreground/80">Total Pagos</p>
                <p className="text-2xl font-bold text-info-foreground">R$ {totalDebitos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-info-foreground/30" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Diarista</Label>
              <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" onClick={limparFiltros} className="w-full">Limpar filtros</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "lançamento encontrado" : "lançamentos encontrados"}
          </p>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filtered.map((l) => (
                  <Card key={l.id} className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm break-words">{l.colaborador?.nome ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{formatDateBR(l.data)}</p>
                        </div>
                        <Badge className={cn("shrink-0 whitespace-nowrap border-transparent text-white hover:opacity-90", l.categoria?.tipo === "C" ? "bg-success" : "bg-destructive")}>
                          {l.categoria?.descricao ?? "—"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Valor</p>
                          <p className={l.categoria?.tipo === "D" ? "text-destructive font-medium" : "text-primary font-medium"}>
                            {l.categoria?.tipo === "D" ? "- " : "+ "}R$ {l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Horário</p>
                          <p>{l.hora_entrada || l.hora_saida ? `${l.hora_entrada || "—"} / ${l.hora_saida || "—"}` : "—"}</p>
                        </div>
                      </div>

                      {l.descricao && <p className="text-sm text-muted-foreground break-words">{l.descricao}</p>}

                      {canEdit && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(l.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Diarista</TableHead>
                      <TableHead className="whitespace-nowrap">Categoria</TableHead>
                      <TableHead className="whitespace-nowrap">Data</TableHead>
                      <TableHead className="whitespace-nowrap">Entrada</TableHead>
                      <TableHead className="whitespace-nowrap">Saída</TableHead>
                      <TableHead className="whitespace-nowrap">Valor</TableHead>
                      <TableHead className="whitespace-nowrap">Descrição</TableHead>
                      <TableHead className="w-[140px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium whitespace-nowrap">{l.colaborador?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <Badge className={cn("whitespace-nowrap border-transparent text-white hover:opacity-90", l.categoria?.tipo === "C" ? "bg-success" : "bg-destructive")}>
                            {l.categoria?.descricao ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateBR(l.data)}</TableCell>
                        <TableCell>{l.hora_entrada || "—"}</TableCell>
                        <TableCell>{l.hora_saida || "—"}</TableCell>
                        <TableCell className={`whitespace-nowrap ${l.categoria?.tipo === "D" ? "text-destructive font-medium" : "text-primary font-medium"}`}>
                          {l.categoria?.tipo === "D" ? "- " : "+ "}R$ {l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{l.descricao || "—"}</TableCell>
                        <TableCell>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(l.id)} className="text-destructive hover:text-destructive">
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
