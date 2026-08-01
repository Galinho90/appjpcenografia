import { useMemo, useState, useEffect } from "react";
import { FileText, FileSpreadsheet, ChevronLeft, ChevronRight, DollarSign, CalendarDays, CheckCircle2, MapPin, Phone, Banknote, CreditCard, ArrowUpRight, ArrowDownLeft, Info, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

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
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-12 w-48 mb-6" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!meuColaborador) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Conta não vinculada</h2>
        <p className="text-muted-foreground max-w-md">
          Sua conta de usuário ainda não está vinculada a um cadastro de colaborador. 
          Entre em contato com o administrador para habilitar seu acesso.
        </p>
      </div>
    );
  }

  const initials = (colaboradorNome || "U").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const pixDisplay = meuColaborador?.pix || meuColaborador?.chave_pix || "—";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <PageHeader title="Meu Extrato" description="Acompanhe seus lançamentos e saldo quinzenal" />
        <Button onClick={gerarPDF} variant="outline" className="sm:w-auto w-full gap-2 border-primary/20 hover:border-primary">
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Esquerdo: Perfil e Quinzena */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="overflow-hidden border-none shadow-premium-sm surface-glass group transition-all hover:shadow-premium">
            <div className="relative h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
              <div className="absolute -bottom-10 left-6">
                <div className="h-20 w-20 rounded-2xl bg-background p-1 shadow-lg ring-1 ring-primary/10">
                  <div className="h-full w-full rounded-xl bg-gradient-to-br from-primary to-primary-foreground/20 flex items-center justify-center overflow-hidden">
                    {meuColaborador?.foto_url ? (
                      <img src={meuColaborador.foto_url} alt={colaboradorNome ?? "Foto"} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">{initials}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <CardContent className="pt-12 pb-6 px-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground leading-none mb-1">{colaboradorNome}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors">
                    {meuColaborador?.funcao || "Colaborador"}
                  </Badge>
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 group-hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-background shadow-sm">
                    <Banknote className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Valor Diária</p>
                    <p className="text-sm font-semibold">{fmtBRL(Number(meuColaborador?.valor_diaria_padrao ?? 0))}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 group-hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-background shadow-sm">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Chave PIX</p>
                    <p className="text-sm font-semibold truncate pr-2">{pixDisplay}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 group-hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-lg bg-background shadow-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Banco / Conta</p>
                    <p className="text-sm font-semibold truncate pr-2">
                      {meuColaborador?.banco || "—"} {meuColaborador?.conta ? `• ${meuColaborador.conta}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-premium-sm border-none overflow-hidden mb-4 sm:mb-6 surface-glass">
            <CardContent className="p-0">
              <div className="flex min-h-[84px] items-center justify-between gap-2 px-4 py-4">
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full hover:bg-primary/10" onClick={() => shiftRef(-1)} aria-label="Quinzena anterior">
                  <ChevronLeft className="h-5 w-5 text-primary" />
                </Button>
                <div className="text-center flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Quinzena Selecionada</p>
                  <p className="text-sm font-bold text-foreground">
                    {fmtDate(selecionada.inicio)} — {fmtDate(selecionada.fim)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full hover:bg-primary/10" onClick={() => shiftRef(1)} aria-label="Próxima quinzena">
                  <ChevronRight className="h-5 w-5 text-primary" />
                </Button>
              </div>
              {!isQuinzenaAtual && (
                <div className="px-4 pb-4">
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold uppercase tracking-wider h-8" onClick={() => setRefDate(new Date())}>
                    Voltar para Hoje
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito: Resumo e Lista */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card className="border-none overflow-hidden shadow-premium-sm surface-glass bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold">Créditos</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Total Lançado</p>
                  <h4 className="text-2xl font-bold tracking-tight">{fmtBRL(totalCreditos)}</h4>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none overflow-hidden shadow-premium-sm surface-glass bg-gradient-to-br from-[#10B981]/10 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-xl bg-[#10B981]/20">
                    <DollarSign className="h-5 w-5 text-[#059669]" />
                  </div>
                  <Badge variant="secondary" className="bg-[#10B981]/20 text-[#059669] border-none text-[10px] uppercase font-bold">Saldo</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">A Receber</p>
                  <h4 className="text-2xl font-bold tracking-tight text-[#059669]">{fmtBRL(aPagar)}</h4>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none overflow-hidden shadow-premium-sm surface-glass bg-gradient-to-br from-[#EF4444]/10 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 rounded-xl bg-[#EF4444]/20">
                    <CheckCircle2 className="h-5 w-5 text-[#DC2626]" />
                  </div>
                  <Badge variant="secondary" className="bg-[#EF4444]/20 text-[#DC2626] border-none text-[10px] uppercase font-bold">Débitos</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Total Pago/Vales</p>
                  <h4 className="text-2xl font-bold tracking-tight text-[#DC2626]">{fmtBRL(totalDebitos)}</h4>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-premium-sm border-none overflow-hidden surface-glass">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 px-6 py-5">
              <div className="space-y-1 text-left">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Histórico de Lançamentos
                </CardTitle>
                <CardDescription>Detalhamento de diárias, vales e reembolsos</CardDescription>
              </div>
              <Badge variant="outline" className="font-bold">
                {lancamentosFiltrados.length} registros
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {lancamentosFiltrados.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-4">
                    <Info className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhum lançamento nesta quinzena.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {lancamentosFiltrados.map((l, index) => {
                    const isDeb = l.categoria?.tipo === "D";
                    const hasHorarios = !!(l.hora_entrada || l.hora_saida);
                    return (
                        <div className="group flex items-center justify-between p-4 sm:p-6 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 border",
                              isDeb ? "bg-destructive/5 border-destructive/20 text-destructive" : "bg-success/5 border-success/20 text-success"
                            )}>
                              {isDeb ? (
                                <ArrowDownLeft className="h-5 w-5" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0 pr-4">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-semibold text-foreground">
                                  {l.categoria?.descricao ?? "Lançamento"}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                                  {formatDateBR(l.data)}
                                </span>
                              </div>
                              {l.descricao && (
                                <p className="text-xs text-muted-foreground/80 font-medium truncate">
                                  {l.descricao}
                                </p>
                              )}
                              {hasHorarios && (
                                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-medium text-muted-foreground/70">
                                  <span className="flex items-center gap-1">
                                    {l.hora_entrada ?? "—"} às {l.hora_saida ?? "—"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn(
                              "text-sm sm:text-base font-bold tabular-nums tracking-tight",
                              isDeb ? "text-destructive" : "text-success"
                            )}>
                              {isDeb ? "-" : "+"} {fmtBRL(l.valor)}
                            </p>
                          </div>
                        </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
