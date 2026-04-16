import { useMemo, useState } from "react";
import { FileText, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  useColaboradores, useDiarias, useVales, useReembolsos, useFechamentos,
  useCreateDiaria, useCreateVale, useCreateReembolso,
} from "@/hooks/useSupabaseData";

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
  if (dir === 1) {
    ref.setDate(q.fim.getDate() + 1);
  } else {
    ref.setDate(q.inicio.getDate() - 1);
  }
  return getQuinzena(ref);
}

const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const fmtBRL = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Lancamento = {
  id: string;
  tipo: "diaria" | "vale" | "reembolso";
  data: string;
  valor: number;
  detalhe?: string;
};

export default function ExtratoDiarista() {
  const { data: colaboradores = [], isLoading: loadingCol } = useColaboradores();
  const { data: diarias = [] } = useDiarias();
  const { data: vales = [] } = useVales();
  const { data: reembolsos = [] } = useReembolsos();
  const { data: fechamentos = [] } = useFechamentos();

  const [colaboradorId, setColaboradorId] = useState<string>("");

  const quinzenaAtual = useMemo(() => getQuinzena(new Date()), []);
  const quinzenaAnterior = useMemo(() => shiftQuinzena(quinzenaAtual, -1), [quinzenaAtual]);

  const [periodo, setPeriodo] = useState<"anterior" | "atual">("atual");
  const selecionada = periodo === "atual" ? quinzenaAtual : quinzenaAnterior;
  const inicioISO = toISO(selecionada.inicio);
  const fimISO = toISO(selecionada.fim);

  const lancamentos = useMemo<Lancamento[]>(() => {
    if (!colaboradorId) return [];
    const inRange = (d: string) => d >= inicioISO && d <= fimISO;
    const ds = diarias
      .filter((d: any) => d.colaborador_id === colaboradorId && inRange(d.data))
      .map((d: any) => ({
        id: `d-${d.id}`,
        tipo: "diaria" as const,
        data: d.data,
        valor: Number(d.valor),
        detalhe: `ENTRADA: ${d.horario_entrada ?? "—"} / SAÍDA: ${d.horario_saida ?? "—"}`,
      }));
    const vs = vales
      .filter((v: any) => v.colaborador_id === colaboradorId && inRange(v.data))
      .map((v: any) => ({
        id: `v-${v.id}`,
        tipo: "vale" as const,
        data: v.data,
        valor: -Math.abs(Number(v.valor)),
        detalhe: v.descricao ?? "",
      }));
    const rs = reembolsos
      .filter((r: any) => r.colaborador_id === colaboradorId && inRange(r.data))
      .map((r: any) => ({
        id: `r-${r.id}`,
        tipo: "reembolso" as const,
        data: r.data,
        valor: Number(r.valor),
        detalhe: r.descricao ?? "",
      }));
    return [...ds, ...vs, ...rs].sort((a, b) => a.data.localeCompare(b.data));
  }, [colaboradorId, diarias, vales, reembolsos, inicioISO, fimISO]);

  // Lançamentos = somatório do que o diarista tem a receber (diárias + reembolsos)
  const totalLancamentos = lancamentos
    .filter((l) => l.tipo === "diaria" || l.tipo === "reembolso")
    .reduce((s, l) => s + l.valor, 0);

  // Pagos = vales já adiantados + valor de fechamentos efetivamente pagos
  const totalVales = lancamentos
    .filter((l) => l.tipo === "vale")
    .reduce((s, l) => s + Math.abs(l.valor), 0);

  const fechamentoSelecionado = fechamentos.find(
    (f: any) => f.colaborador_id === colaboradorId && f.periodo_inicio === inicioISO && f.periodo_fim === fimISO
  );
  const totalFechamentoPago = fechamentoSelecionado?.status === "pago" ? Number((fechamentoSelecionado as any).valor_final) : 0;
  const totalPago = totalVales + totalFechamentoPago;
  const aPagar = Math.max(totalLancamentos - totalPago, 0);

  const colaboradorNome = colaboradores.find((c) => c.id === colaboradorId)?.nome;
  const colaboradorSel = colaboradores.find((c) => c.id === colaboradorId);

  const tipoLabel: Record<Lancamento["tipo"], string> = {
    diaria: "DIÁRIA",
    vale: "VALE",
    reembolso: "REEMBOLSO",
  };

  // ── Modal "Novo Lançamento" ──
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<"diaria" | "vale" | "reembolso">("diaria");
  const hoje = toISO(new Date());
  const [diariaForm, setDiariaForm] = useState({ data: hoje, hora_entrada: "", hora_saida: "", valor: 0, observacoes: "" });
  const [valeForm, setValeForm] = useState({ data: hoje, valor: 0, descricao: "" });
  const [reembForm, setReembForm] = useState({ data: hoje, valor: 0, descricao: "" });

  const createDiaria = useCreateDiaria();
  const createVale = useCreateVale();
  const createReemb = useCreateReembolso();

  const abrirModal = () => {
    if (!colaboradorId) {
      toast({ title: "Selecione um diarista", description: "Escolha um diarista antes de lançar.", variant: "destructive" });
      return;
    }
    setDiariaForm({ data: hoje, hora_entrada: "", hora_saida: "", valor: colaboradorSel?.valor_diaria_padrao ?? 0, observacoes: "" });
    setValeForm({ data: hoje, valor: 0, descricao: "" });
    setReembForm({ data: hoje, valor: 0, descricao: "" });
    setTab("diaria");
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    try {
      if (tab === "diaria") {
        await createDiaria.mutateAsync({
          colaborador_id: colaboradorId,
          data: diariaForm.data,
          hora_entrada: diariaForm.hora_entrada || undefined,
          hora_saida: diariaForm.hora_saida || undefined,
          valor: Number(diariaForm.valor),
          observacoes: diariaForm.observacoes || undefined,
        });
        toast({ title: "Diária registrada!" });
      } else if (tab === "vale") {
        await createVale.mutateAsync({
          colaborador_id: colaboradorId,
          data: valeForm.data,
          valor: Number(valeForm.valor),
          descricao: valeForm.descricao || undefined,
        });
        toast({ title: "Vale registrado!" });
      } else {
        await createReemb.mutateAsync({
          colaborador_id: colaboradorId,
          data: reembForm.data,
          valor: Number(reembForm.valor),
          descricao: reembForm.descricao || undefined,
        });
        toast({ title: "Reembolso registrado!" });
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const salvando = createDiaria.isPending || createVale.isPending || createReemb.isPending;

  const gerarPDF = (q: { inicio: Date; fim: Date }, labelPeriodo: string) => {
    if (!colaboradorId) {
      toast({ title: "Selecione um diarista", variant: "destructive" });
      return;
    }
    const ini = toISO(q.inicio);
    const fim = toISO(q.fim);
    const inRange = (d: string) => d >= ini && d <= fim;

    const ds = diarias.filter((d: any) => d.colaborador_id === colaboradorId && inRange(d.data));
    const vs = vales.filter((v: any) => v.colaborador_id === colaboradorId && inRange(v.data));
    const rs = reembolsos.filter((r: any) => r.colaborador_id === colaboradorId && inRange(r.data));

    const linhas: [string, string, string, string][] = [
      ...ds.map((d: any) => [
        new Date(d.data).toLocaleDateString("pt-BR"),
        "Diária",
        `${d.horario_entrada || "—"} / ${d.horario_saida || "—"}`,
        fmtBRL(Number(d.valor)),
      ] as [string, string, string, string]),
      ...vs.map((v: any) => [
        new Date(v.data).toLocaleDateString("pt-BR"),
        "Vale",
        v.descricao || "",
        `- ${fmtBRL(Math.abs(Number(v.valor)))}`,
      ] as [string, string, string, string]),
      ...rs.map((r: any) => [
        new Date(r.data).toLocaleDateString("pt-BR"),
        "Reembolso",
        r.descricao || "",
        fmtBRL(Number(r.valor)),
      ] as [string, string, string, string]),
    ].sort((a, b) => a[0].split("/").reverse().join("").localeCompare(b[0].split("/").reverse().join("")));

    const totalDiarias = ds.reduce((s: number, d: any) => s + Number(d.valor), 0);
    const totalVales = vs.reduce((s: number, v: any) => s + Number(v.valor), 0);
    const totalReemb = rs.reduce((s: number, r: any) => s + Number(r.valor), 0);
    const total = totalDiarias - totalVales + totalReemb;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Extrato do Diarista", 14, 18);
    doc.setFontSize(11);
    doc.text(`Diarista: ${colaboradorNome ?? "—"}`, 14, 28);
    doc.text(`${labelPeriodo}: ${fmtDate(q.inicio)} a ${fmtDate(q.fim)}`, 14, 35);

    autoTable(doc, {
      head: [["Data", "Tipo", "Detalhe", "Valor"]],
      body: linhas.length ? linhas : [["—", "—", "Sem lançamentos", "—"]],
      startY: 42,
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 10 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.text(`Total Diárias: ${fmtBRL(totalDiarias)}`, 14, finalY);
    doc.text(`Total Vales: -${fmtBRL(totalVales)}`, 14, finalY + 6);
    doc.text(`Total Reembolsos: ${fmtBRL(totalReemb)}`, 14, finalY + 12);
    doc.setFontSize(13);
    doc.text(`TOTAL A PAGAR: ${fmtBRL(total)}`, 14, finalY + 22);

    const slug = (colaboradorNome ?? "diarista").toLowerCase().replace(/\s+/g, "-");
    doc.save(`extrato-${slug}-${ini}-${fim}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Extrato do Diarista</CardTitle>
          <Button className="gap-2" onClick={abrirModal}>
            <FileText className="h-4 w-4" /> Novo Lançamento
          </Button>
        </CardHeader>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lançamento {colaboradorNome ? `— ${colaboradorNome}` : ""}</DialogTitle>
          </DialogHeader>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="diaria">Diária</TabsTrigger>
              <TabsTrigger value="vale">Vale</TabsTrigger>
              <TabsTrigger value="reembolso">Reembolso</TabsTrigger>
            </TabsList>

            <TabsContent value="diaria" className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={diariaForm.data} onChange={(e) => setDiariaForm({ ...diariaForm, data: e.target.value })} /></div>
                <div className="space-y-2"><Label>Entrada</Label><Input type="time" value={diariaForm.hora_entrada} onChange={(e) => setDiariaForm({ ...diariaForm, hora_entrada: e.target.value })} /></div>
                <div className="space-y-2"><Label>Saída</Label><Input type="time" value={diariaForm.hora_saida} onChange={(e) => setDiariaForm({ ...diariaForm, hora_saida: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={diariaForm.valor || ""} onChange={(e) => setDiariaForm({ ...diariaForm, valor: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={diariaForm.observacoes} onChange={(e) => setDiariaForm({ ...diariaForm, observacoes: e.target.value })} placeholder="Opcional..." /></div>
            </TabsContent>

            <TabsContent value="vale" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={valeForm.data} onChange={(e) => setValeForm({ ...valeForm, data: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={valeForm.valor || ""} onChange={(e) => setValeForm({ ...valeForm, valor: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Input value={valeForm.descricao} onChange={(e) => setValeForm({ ...valeForm, descricao: e.target.value })} placeholder="Motivo do vale..." /></div>
            </TabsContent>

            <TabsContent value="reembolso" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={reembForm.data} onChange={(e) => setReembForm({ ...reembForm, data: e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={reembForm.valor || ""} onChange={(e) => setReembForm({ ...reembForm, valor: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Input value={reembForm.descricao} onChange={(e) => setReembForm({ ...reembForm, descricao: e.target.value })} placeholder="Descrição do reembolso..." /></div>
            </TabsContent>
          </Tabs>
          <Button className="w-full mt-2" onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar Lançamento"}
          </Button>
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
            ) : (
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um diarista..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "anterior" as const, label: "Quinzena Anterior", q: quinzenaAnterior },
              { key: "atual" as const, label: "Quinzena Atual", q: quinzenaAtual },
            ].map((opt) => {
              const active = periodo === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPeriodo(opt.key)}
                  className={cn(
                    "rounded-lg border-2 p-5 text-center transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <p className="font-semibold text-foreground">{opt.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fmtDate(opt.q.inicio)} a {fmtDate(opt.q.fim)}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span
                      role="button"
                      title="Baixar PDF do extrato"
                      onClick={(e) => { e.stopPropagation(); gerarPDF(opt.q, opt.label); }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted/70 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-accent p-6 text-center">
            <p className="text-2xl font-bold text-accent-foreground">{fmtBRL(aPagar)}</p>
            <p className="text-sm text-accent-foreground/90">A Pagar</p>
          </div>
        </Card>
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-primary p-6 text-center">
            <p className="text-2xl font-bold text-primary-foreground">{fmtBRL(totalLancamentos)}</p>
            <p className="text-sm text-primary-foreground/90">Lançamentos</p>
          </div>
        </Card>
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-destructive p-6 text-center">
            <p className="text-2xl font-bold text-destructive-foreground">{fmtBRL(totalPago)}</p>
            <p className="text-sm text-destructive-foreground/90">Pagos</p>
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
          ) : lancamentos.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum lançamento na quinzena selecionada.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {lancamentos.map((l) => {
                const isNegativo = l.valor < 0;
                const accentClass =
                  l.tipo === "diaria"
                    ? "border-l-success"
                    : l.tipo === "vale"
                    ? "border-l-destructive"
                    : "border-l-info";
                return (
                  <Card
                    key={l.id}
                    className={cn(
                      "border-l-4 shadow-sm hover:shadow-md transition-shadow",
                      accentClass
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(l.data).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {tipoLabel[l.tipo]}
                          </p>
                          {l.detalhe && (
                            <p className="text-xs text-muted-foreground mt-1 break-words">
                              {l.detalhe}
                            </p>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-base font-bold whitespace-nowrap",
                            isNegativo ? "text-destructive" : "text-success"
                          )}
                        >
                          {fmtBRL(l.valor)}
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
