import { useEffect, useMemo, useState } from "react";
import { FileText, FileSpreadsheet, ChevronLeft, ChevronRight, DollarSign, CalendarDays, CheckCircle2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateBR } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useColaboradores, useFechamentos,
  useCategorias, useLancamentos, useCreateLancamento, useClientes,
} from "@/hooks/useSupabaseData";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

async function loadImageAsDataURL(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

function getQuinzena(ref: Date) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  if (d <= 15) {
    return { inicio: new Date(y, m, 1), fim: new Date(y, m, 15) };
  }
  const fim = new Date(y, m + 1, 0);
  return { inicio: new Date(y, m, 16), fim };
}

function shiftQuinzena(q: { inicio: Date; fim: Date }, dir: -1 | 1) {
  const ref = new Date(q.inicio);
  if (dir === 1) ref.setDate(q.fim.getDate() + 1);
  else ref.setDate(q.inicio.getDate() - 1);
  return getQuinzena(ref);
}

const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExtratoDiarista() {
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const { data: colaboradoresAll = [], isLoading: loadingCol } = useColaboradores();
  const colaboradores = useMemo(() => colaboradoresAll.filter(c => c.ativo), [colaboradoresAll]);
  const { data: categorias = [] } = useCategorias();
  const { data: lancamentos = [] } = useLancamentos();
  const { data: fechamentos = [] } = useFechamentos();
  const { data: clientes = [] } = useClientes();
  const createLancamento = useCreateLancamento();

  const [colaboradorId, setColaboradorId] = useState<string>("");

  const [refDate, setRefDate] = useState<Date>(new Date());
  const selecionada = useMemo(() => getQuinzena(refDate), [refDate]);
  const hojeQuinzena = useMemo(() => getQuinzena(new Date()), []);
  const isQuinzenaAtual =
    selecionada.inicio.getTime() === hojeQuinzena.inicio.getTime() &&
    selecionada.fim.getTime() === hojeQuinzena.fim.getTime();
  const inicioISO = toISO(selecionada.inicio);
  const fimISO = toISO(selecionada.fim);

  const { data: empresa } = useCompanyLogo();

  const shiftRef = (dir: -1 | 1) => {
    const next = shiftQuinzena(selecionada, dir);
    setRefDate(next.inicio);
  };

  // Filtra lançamentos do diarista no período
  const lancamentosFiltrados = useMemo(() => {
    if (!colaboradorId) return [];
    return lancamentos
      .filter(l => l.colaborador_id === colaboradorId && l.data >= inicioISO && l.data <= fimISO)
      .sort((a, b) => {
        const d = a.data.localeCompare(b.data);
        if (d !== 0) return d;
        const ca = (a as any).created_at ?? "";
        const cb = (b as any).created_at ?? "";
        const c = String(ca).localeCompare(String(cb));
        if (c !== 0) return c;
        return String(a.id).localeCompare(String(b.id));
      });
  }, [lancamentos, colaboradorId, inicioISO, fimISO]);

  // Crédito = soma a pagar; Débito = desconta
  const totalCreditos = lancamentosFiltrados
    .filter(l => l.categoria?.tipo === "C")
    .reduce((s, l) => s + l.valor, 0);
  const totalDebitos = lancamentosFiltrados
    .filter(l => l.categoria?.tipo === "D")
    .reduce((s, l) => s + l.valor, 0);

  // Débitos / Pagos = soma de todos os débitos (vales + pagamentos).
  // A Pagar = créditos - débitos. Pode ficar negativo quando há vales sem cobertura de crédito.
  const totalPago = totalDebitos;
  const aPagar = totalCreditos - totalDebitos;

  const colaboradorSel = colaboradoresAll.find(c => c.id === colaboradorId);
  const colaboradorNome = colaboradorSel?.nome;

  // ── Modal ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);
  const hoje = toISO(new Date());
  const categoriasAtivas = categorias.filter(c => c.ativo);
  const [form, setForm] = useState({
    categoria_id: "",
    data: hoje,
    valor: 0,
    hora_entrada: "",
    hora_saida: "",
    descricao: "",
  });

  const categoriaSelecionada = categorias.find(c => c.id === form.categoria_id);
  const descCategoria = categoriaSelecionada?.descricao.toUpperCase() ?? "";
  const usaHorario = !descCategoria.includes("PAGAMENTO") && (
    descCategoria.includes("DIÁRIA") || descCategoria.includes("DIARIA") || descCategoria.includes("DOBRA") || descCategoria.includes("HORAS EXTRAS")
  );

  const abrirModal = () => {
    if (!colaboradorId) {
      toast({ title: "Selecione um diarista", variant: "destructive" });
      return;
    }
    setForm({
      categoria_id: "",
      data: hoje,
      valor: colaboradorSel?.valor_diaria_padrao ?? 0,
      hora_entrada: "",
      hora_saida: "",
      descricao: "",
    });
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    if (!form.categoria_id) {
      toast({ title: "Selecione uma categoria", variant: "destructive" });
      return;
    }
    try {
      await createLancamento.mutateAsync({
        colaborador_id: colaboradorId,
        categoria_id: form.categoria_id,
        data: form.data,
        valor: Number(form.valor),
        hora_entrada: usaHorario && form.hora_entrada ? form.hora_entrada : null,
        hora_saida: usaHorario && form.hora_saida ? form.hora_saida : null,
        descricao: form.descricao || null,
      });
      toast({ title: "Lançamento registrado!" });
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const gerarPDF = async (q: { inicio: Date; fim: Date }, labelPeriodo: string) => {
    if (!colaboradorId) {
      toast({ title: "Selecione um diarista", variant: "destructive" });
      return;
    }
    const ini = toISO(q.inicio);
    const fim = toISO(q.fim);
    const inRange = (d: string) => d >= ini && d <= fim;
    const list = lancamentos
      .filter(l => l.colaborador_id === colaboradorId && inRange(l.data))
      .sort((a, b) => {
        const d = a.data.localeCompare(b.data);
        if (d !== 0) return d;
        const ca = (a as any).created_at ?? "";
        const cb = (b as any).created_at ?? "";
        const c = String(ca).localeCompare(String(cb));
        if (c !== 0) return c;
        return String(a.id).localeCompare(String(b.id));
      });

    const linhas = list.map(l => {
      const isDeb = l.categoria?.tipo === "D";
      return [
        formatDateBR(l.data),
        l.categoria?.descricao ?? "—",
        l.hora_entrada ? String(l.hora_entrada).slice(0, 5) : "—",
        l.hora_saida ? String(l.hora_saida).slice(0, 5) : "—",
        l.descricao || "—",
        `${isDeb ? "- " : ""}${fmtBRL(l.valor)}`,
      ] as [string, string, string, string, string, string];
    });

    const totC = list.filter(l => l.categoria?.tipo === "C").reduce((s, l) => s + l.valor, 0);
    const totD = list.filter(l => l.categoria?.tipo === "D").reduce((s, l) => s + l.valor, 0);
    const total = totC - totD;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Paleta (alinhada ao app: violet primary, green success, red destructive)
    const PRIMARY: [number, number, number] = [124, 58, 237];
    const SUCCESS: [number, number, number] = [16, 185, 129];
    const DANGER: [number, number, number] = [239, 68, 68];
    const MUTED: [number, number, number] = [100, 116, 139];
    const SOFT: [number, number, number] = [243, 244, 246];
    const DARK: [number, number, number] = [17, 24, 39];

    // ── HEADER ──
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageW, 34, "F");

    // Logo (se existir)
    let textX = margin;
    if (empresa?.logo_url) {
      const img = await loadImageAsDataURL(empresa.logo_url);
      if (img && img.w && img.h) {
        const maxH = 16;
        const maxW = 30;
        const ratio = img.w / img.h;
        let h = maxH;
        let w = h * ratio;
        if (w > maxW) { w = maxW; h = w / ratio; }
        const padX = 3, padY = 2.5;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, 11, w + padX * 2, h + padY * 2, 1.5, 1.5, "F");
        const fmt = img.dataUrl.includes("image/png") ? "PNG" : "JPEG";
        try { doc.addImage(img.dataUrl, fmt, margin + padX, 11 + padY, w, h); } catch {}
        textX = margin + w + padX * 2 + 6;
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("EXTRATO DO DIARISTA", textX, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || "";
    if (empresaNome) doc.text(empresaNome, textX, 24);
    doc.setFontSize(9);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, textX, 30);

    // ── INFO CARD ──
    let y = 44;
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(...SOFT);
    doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, "F");

    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DIARISTA", margin + 4, y + 6);
    doc.text(labelPeriodo.toUpperCase(), pageW / 2 + 2, y + 6);

    doc.setTextColor(...DARK);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(colaboradorNome ?? "—", margin + 4, y + 14);
    doc.setFontSize(11);
    doc.text(`${fmtDate(q.inicio)}  —  ${fmtDate(q.fim)}`, pageW / 2 + 2, y + 14);

    if (colaboradorSel?.funcao) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(colaboradorSel.funcao, margin + 4, y + 19);
    }

    // ── TABELA ──
    autoTable(doc, {
      startY: y + 28,
      head: [["Data", "Categoria", "Entrada", "Saída", "Descrição", "Valor"]],
      body: linhas.length ? linhas : [["—", "—", "—", "—", "Sem lançamentos no período", "—"]],
      theme: "grid",
      styles: {
        overflow: "linebreak",
        valign: "middle",
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      },
      headStyles: {
        fillColor: PRIMARY,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "left",
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: DARK,
      },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 38, overflow: "linebreak" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: "auto" as any, overflow: "linebreak" },
        5: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const raw = String(data.cell.raw ?? "");
          if (raw.trim().startsWith("-")) {
            data.cell.styles.textColor = DANGER;
          } else if (raw.includes("R$")) {
            data.cell.styles.textColor = SUCCESS;
          }
        }
      },
      margin: { left: margin, right: margin },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // ── RESUMO (3 cards lado a lado) ──
    const cardW = (pageW - margin * 2 - 8) / 3;
    const cardH = 22;
    if (finalY + cardH + 30 > pageH - 20) { doc.addPage(); finalY = 20; }

    const drawSummaryCard = (x: number, label: string, value: string, color: [number, number, number]) => {
      doc.setFillColor(...color);
      doc.roundedRect(x, finalY, cardW, cardH, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(label.toUpperCase(), x + 4, finalY + 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(value, x + 4, finalY + 17);
    };

    drawSummaryCard(margin, "Créditos", fmtBRL(totC), SUCCESS);
    drawSummaryCard(margin + cardW + 4, "Débitos / Pagos", `- ${fmtBRL(totD)}`, DANGER);
    drawSummaryCard(margin + (cardW + 4) * 2, "Total a Pagar", `${total < 0 ? "- " : ""}${fmtBRL(Math.abs(total))}`, PRIMARY);

    // ── FOOTER ──
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(empresaNome || "Extrato", margin, pageH - 8);
      doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
    }

    const slug = (colaboradorNome ?? "diarista").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
    doc.save(`extrato-${slug}-${ini}-${fim}.pdf`);
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button className="gap-2 w-full sm:w-auto" onClick={abrirModal}>
            <FileText className="h-4 w-4" /> Novo Lançamento
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lançamento {colaboradorNome ? `— ${colaboradorNome}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
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
                        {categoriasAtivas.map((c) => {
                          const descricao = c.descricao.toUpperCase();
                          const categoriaUsaHorario = !descricao.includes("PAGAMENTO") && (
                            descricao.includes("DIÁRIA") || descricao.includes("DIARIA") || descricao.includes("DOBRA") || descricao.includes("HORAS EXTRAS")
                          );
                          return (
                            <CommandItem key={c.id} value={c.descricao} onSelect={() => {
                              setForm({
                                ...form,
                                categoria_id: c.id,
                                hora_entrada: categoriaUsaHorario ? form.hora_entrada : "",
                                hora_saida: categoriaUsaHorario ? form.hora_saida : "",
                              });
                              setCatPopoverOpen(false);
                            }}>
                              <Check className={cn("mr-2 h-4 w-4", form.categoria_id === c.id ? "opacity-100" : "opacity-0")} />
                              <Badge className={cn("text-[10px] px-1.5 py-0 mr-2 shrink-0 border-transparent text-white hover:opacity-90", c.tipo === "C" ? "bg-success" : "bg-destructive")}>
                                {c.tipo === "C" ? "Crédito" : "Débito"}
                              </Badge>
                              <span className="truncate">{c.descricao}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className={cn("grid gap-3", usaHorario ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
              {usaHorario && (
                <>
                  <div className="space-y-2">
                    <Label>Entrada</Label>
                    <Input type="time" value={form.hora_entrada} onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Saída</Label>
                    <Input type="time" value={form.hora_saida} onChange={(e) => setForm({ ...form, hora_saida: e.target.value })} />
                  </div>
                </>
              )}
              {!usaHorario && (
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
                </div>
              )}
            </div>

            {usaHorario && (
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Opcional..." />
            </div>

            <Button className="w-full" onClick={handleSalvar} disabled={createLancamento.isPending}>
              {createLancamento.isPending ? "Salvando..." : "Salvar Lançamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Extrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Diarista</Label>
            {loadingCol ? (
              <Skeleton className="h-10 w-full" />
            ) : colaboradores.length > 5 ? (
              <ColaboradorCombobox colaboradores={colaboradores} value={colaboradorId} onChange={setColaboradorId} />
            ) : (
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger><SelectValue placeholder="Selecione um diarista..." /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="rounded-lg border-2 border-border bg-card p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => shiftRef(-1)} aria-label="Quinzena anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-1 text-center flex-1 sm:min-w-[200px] min-w-0">
                  <p className="text-xs text-muted-foreground">Quinzena</p>
                  <p className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                    {fmtDate(selecionada.inicio)} — {fmtDate(selecionada.fim)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => shiftRef(1)} aria-label="Próxima quinzena">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!isQuinzenaAtual && (
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setRefDate(new Date())}>Hoje</Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-none"
                  onClick={() => gerarPDF(selecionada, "Período")}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Baixar PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-none overflow-hidden shadow-lg">
          <div className={`p-4 sm:p-6 ${aPagar < 0 ? "bg-destructive" : "bg-accent"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xl sm:text-2xl font-bold ${aPagar < 0 ? "text-destructive-foreground" : "text-accent-foreground"}`}>{fmtBRL(aPagar)}</p>
                <p className={`text-sm ${aPagar < 0 ? "text-destructive-foreground/90" : "text-accent-foreground/90"}`}>A Pagar</p>
              </div>
              <DollarSign className={`h-10 w-10 ${aPagar < 0 ? "text-destructive-foreground/30" : "text-accent-foreground/30"}`} />
            </div>
          </div>
        </Card>
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-primary p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-primary-foreground">{fmtBRL(totalCreditos)}</p>
                <p className="text-sm text-primary-foreground/90">Créditos</p>
              </div>
              <CalendarDays className="h-10 w-10 text-primary-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-destructive p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-destructive-foreground">{fmtBRL(totalPago)}</p>
                <p className="text-sm text-destructive-foreground/90">Débitos / Pagos</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-destructive-foreground/30" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base">
            Extrato {colaboradorNome ? `— ${colaboradorNome}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!colaboradorId ? (
            <p className="py-8 text-center text-muted-foreground">Selecione um diarista para visualizar o extrato.</p>
          ) : lancamentosFiltrados.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum lançamento na quinzena selecionada.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {lancamentosFiltrados.map(l => {
                const isDeb = l.categoria?.tipo === "D";
                const accent = isDeb ? "border-l-destructive" : "border-l-success";
                const colorValue = isDeb ? "text-destructive" : "text-success";
                const hasHorarios = !!(l.hora_entrada || l.hora_saida);
                return (
                  <Card key={l.id} className={cn("border-l-4 shadow-sm hover:shadow-md transition-shadow", accent)}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                              {formatDateBR(l.data)}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-foreground break-words leading-tight">
                            {l.categoria?.descricao ?? "—"}
                          </p>
                          {hasHorarios && (
                            <p className="text-[11px] text-muted-foreground">
                              Entrada: {l.hora_entrada ?? "—"} • Saída: {l.hora_saida ?? "—"}
                            </p>
                          )}
                          {l.descricao && (
                            <p className="text-xs text-muted-foreground break-words">{l.descricao}</p>
                          )}
                        </div>
                        <p className={cn("text-base sm:text-lg font-bold whitespace-nowrap shrink-0", colorValue)}>
                          {isDeb ? "- " : ""}{fmtBRL(l.valor)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ColaboradorCombobox({
  colaboradores,
  value,
  onChange,
}: {
  colaboradores: { id: string; nome: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selecionado = colaboradores.find(c => c.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selecionado ? selecionado.nome : "Selecione um diarista..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar diarista..." />
          <CommandList>
            <CommandEmpty>Nenhum diarista encontrado.</CommandEmpty>
            <CommandGroup>
              {colaboradores.map(c => (
                <CommandItem
                  key={c.id}
                  value={c.nome}
                  onSelect={() => { onChange(c.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  {c.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
