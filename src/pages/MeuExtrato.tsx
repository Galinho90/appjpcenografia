import { useMemo, useState, useEffect } from "react";
import { FileText, FileSpreadsheet, ChevronLeft, ChevronRight, DollarSign, CalendarDays, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateBR } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLancamentos } from "@/hooks/useSupabaseData";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";

function getQuinzena(ref: Date) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  if (d <= 15) return { inicio: new Date(y, m, 1), fim: new Date(y, m, 15) };
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

export default function MeuExtrato() {
  const { user } = useAuth();

  const { data: meuColaborador, isLoading: loadingMe } = useQuery({
    queryKey: ["meu-colaborador", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, valor_diaria_padrao, funcao, telefone, email, foto_url, pix, chave_pix, banco, agencia, conta")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lancamentos = [] } = useLancamentos();

  const [refDate, setRefDate] = useState<Date>(new Date());
  const selecionada = useMemo(() => getQuinzena(refDate), [refDate]);
  const hojeQuinzena = useMemo(() => getQuinzena(new Date()), []);
  const isQuinzenaAtual =
    selecionada.inicio.getTime() === hojeQuinzena.inicio.getTime() &&
    selecionada.fim.getTime() === hojeQuinzena.fim.getTime();
  const inicioISO = toISO(selecionada.inicio);
  const fimISO = toISO(selecionada.fim);

  const colaboradorId = meuColaborador?.id;
  const colaboradorNome = meuColaborador?.nome;

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

  const totalCreditos = lancamentosFiltrados.filter(l => l.categoria?.tipo === "C").reduce((s, l) => s + l.valor, 0);
  const totalDebitos = lancamentosFiltrados.filter(l => l.categoria?.tipo === "D").reduce((s, l) => s + l.valor, 0);
  const aPagar = Math.max(totalCreditos - totalDebitos, 0);

  const shiftRef = (dir: -1 | 1) => {
    const next = shiftQuinzena(selecionada, dir);
    setRefDate(next.inicio);
  };

  const gerarPDF = () => {
    if (!colaboradorId) return;
    const list = lancamentosFiltrados;
    const linhas = list.map(l => {
      const isDeb = l.categoria?.tipo === "D";
      return [
        formatDateBR(l.data),
        l.categoria?.descricao ?? "—",
        l.descricao || "",
        `${isDeb ? "- " : ""}${fmtBRL(l.valor)}`,
      ] as [string, string, string, string];
    });
    const totC = list.filter(l => l.categoria?.tipo === "C").reduce((s, l) => s + l.valor, 0);
    const totD = list.filter(l => l.categoria?.tipo === "D").reduce((s, l) => s + l.valor, 0);
    const total = totC - totD;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Meu Extrato", 14, 18);
    doc.setFontSize(11);
    doc.text(`Diarista: ${colaboradorNome ?? "—"}`, 14, 28);
    doc.text(`Período: ${fmtDate(selecionada.inicio)} a ${fmtDate(selecionada.fim)}`, 14, 35);

    autoTable(doc, {
      head: [["Data", "Categoria", "Descrição", "Valor"]],
      body: linhas.length ? linhas : [["—", "—", "Sem lançamentos", "—"]],
      startY: 42,
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 10 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.text(`Total Créditos: ${fmtBRL(totC)}`, 14, finalY);
    doc.text(`Total Débitos: -${fmtBRL(totD)}`, 14, finalY + 6);
    doc.setFontSize(13);
    doc.text(`TOTAL A PAGAR: ${fmtBRL(total)}`, 14, finalY + 16);

    const slug = (colaboradorNome ?? "diarista").toLowerCase().replace(/\s+/g, "-");
    doc.save(`meu-extrato-${slug}-${inicioISO}-${fimISO}.pdf`);
  };

  if (loadingMe) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!meuColaborador) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            Sua conta ainda não está vinculada a um cadastro de diarista. Entre em contato com o administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  const initials = (colaboradorNome || "U").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const pixDisplay = meuColaborador?.pix || meuColaborador?.chave_pix || "—";

  return (
    <div className="space-y-6">
      <PageHeader title="Meu Extrato" description="Visualize seus lançamentos por quinzena." />

      <Card className="shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden shrink-0">
              {meuColaborador?.foto_url ? (
                <img src={meuColaborador.foto_url} alt={colaboradorNome ?? "Foto"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary-foreground text-xl font-bold">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-primary-foreground text-lg sm:text-xl font-bold truncate">{colaboradorNome}</p>
              {meuColaborador?.funcao && (
                <p className="text-primary-foreground/90 text-sm truncate">{meuColaborador.funcao}</p>
              )}
              {meuColaborador?.telefone && (
                <p className="text-primary-foreground/80 text-xs truncate">{meuColaborador.telefone}</p>
              )}
            </div>
          </div>
        </div>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Diária</p>
              <p className="font-semibold">{fmtBRL(Number(meuColaborador?.valor_diaria_padrao ?? 0))}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Chave PIX</p>
              <p className="font-semibold truncate">{pixDisplay}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Banco</p>
              <p className="font-semibold truncate">{meuColaborador?.banco || "—"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ag / Conta</p>
              <p className="font-semibold truncate">
                {meuColaborador?.agencia || meuColaborador?.conta
                  ? `${meuColaborador?.agencia ?? "—"} / ${meuColaborador?.conta ?? "—"}`
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Período
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {!isQuinzenaAtual && (
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setRefDate(new Date())}>Hoje</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-primary p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-primary-foreground">{fmtBRL(totalCreditos)}</p>
                <p className="text-sm text-primary-foreground/90">Lançamentos</p>
              </div>
              <CalendarDays className="h-10 w-10 text-primary-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-accent p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-accent-foreground">{fmtBRL(aPagar)}</p>
                <p className="text-sm text-accent-foreground/90">A Receber</p>
              </div>
              <DollarSign className="h-10 w-10 text-accent-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none overflow-hidden shadow-lg">
          <div className="bg-destructive p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-destructive-foreground">{fmtBRL(totalDebitos)}</p>
                <p className="text-sm text-destructive-foreground/90">Pagos</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-destructive-foreground/30" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {lancamentosFiltrados.length === 0 ? (
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
                    <CardContent className="p-4 sm:p-5">
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
