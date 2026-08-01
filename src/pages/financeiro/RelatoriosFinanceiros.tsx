import { useMemo, useState } from "react";
import { Download, TrendingUp, TrendingDown, Scale, FileBarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useContasBancarias, useMovimentacoes } from "@/hooks/useFinanceiro";
import { fmtBRL, fmtDate } from "@/lib/financeiro";
import { PageHeader } from "@/components/PageHeader";

const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RelatoriosFinanceiros() {
  const { data: contas = [] } = useContasBancarias();
  const [dataInicio, setDataInicio] = useState(firstDayOfMonth());
  const [dataFim, setDataFim] = useState(today());
  const [contaId, setContaId] = useState("all");
  const [statusFiltro, setStatusFiltro] = useState<"pago" | "all">("pago");

  const { data: movs = [], isLoading } = useMovimentacoes({
    contaId: contaId === "all" ? undefined : contaId,
  });

  const dataEfetiva = (m: any) =>
    m.status === "pago" ? (m.data_pagamento ?? m.data_vencimento) : m.data_vencimento;

  const movsFiltradas = useMemo(
    () => movs.filter((m) => {
      if (statusFiltro !== "all" && m.status !== statusFiltro) return false;
      const d = dataEfetiva(m);
      if (!d) return false;
      return d >= dataInicio && d <= dataFim;
    }),
    [movs, statusFiltro, dataInicio, dataFim]
  );

  // ── KPIs ──
  const entradas = movsFiltradas.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
  const saidas = movsFiltradas.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
  const resultado = entradas - saidas;

  // ── Fluxo diário ──
  const fluxoDiario = useMemo(() => {
    const map = new Map<string, { data: string; entradas: number; saidas: number; saldo: number }>();
    movsFiltradas.forEach((m) => {
      const d = dataEfetiva(m);
      if (!d) return;
      const cur = map.get(d) ?? { data: d, entradas: 0, saidas: 0, saldo: 0 };
      if (m.tipo === "entrada") cur.entradas += m.valor;
      if (m.tipo === "saida") cur.saidas += m.valor;
      cur.saldo = cur.entradas - cur.saidas;
      map.set(d, cur);
    });
    return [...map.values()].sort((a, b) => a.data.localeCompare(b.data));
  }, [movsFiltradas]);

  // ── Por categoria ──
  const porCategoria = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string; tipo: string; total: number }>();
    movsFiltradas.forEach((m) => {
      let nome = m.categoria?.nome ?? "Sem categoria";
      let cor = m.categoria?.cor ?? "#94a3b8";
      // Agrupa "Vales Diaristas" junto com "Pagamento Diaristas" nos relatórios
      if (nome === "Vales Diaristas") nome = "Pagamento Diaristas";
      const tipo = m.tipo;
      const key = `${tipo}:${nome}`;
      const cur = map.get(key) ?? { nome, cor, tipo, total: 0 };
      cur.total += m.valor;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [movsFiltradas]);

  const despesasCategoria = porCategoria.filter((c) => c.tipo === "saida");
  const receitasCategoria = porCategoria.filter((c) => c.tipo === "entrada");

  // ── Por conta ──
  const porConta = useMemo(() => {
    const map = new Map<string, { conta: string; entradas: number; saidas: number; saldo: number }>();
    movsFiltradas.forEach((m) => {
      const nome = m.conta?.apelido ?? "—";
      const cur = map.get(nome) ?? { conta: nome, entradas: 0, saidas: 0, saldo: 0 };
      if (m.tipo === "entrada") cur.entradas += m.valor;
      if (m.tipo === "saida") cur.saidas += m.valor;
      cur.saldo = cur.entradas - cur.saidas;
      map.set(nome, cur);
    });
    return [...map.values()].sort((a, b) => b.saldo - a.saldo);
  }, [movsFiltradas]);

  // ── DRE simplificado ──
  const dre = useMemo(() => {
    const receitas = receitasCategoria.reduce((s, c) => s + c.total, 0);
    const despesas = despesasCategoria.reduce((s, c) => s + c.total, 0);
    return { receitas, despesas, liquido: receitas - despesas };
  }, [receitasCategoria, despesasCategoria]);

  const exportarMovimentacoes = () => {
    const rows = movsFiltradas.map((m) => ({
      Data: m.data_pagamento ?? m.data_vencimento ?? "",
      Tipo: m.tipo,
      Descricao: m.descricao,
      Categoria: m.categoria?.nome ?? "",
      Conta: m.conta?.apelido ?? "",
      Status: m.status,
      Valor: m.valor.toFixed(2).replace(".", ","),
    }));
    downloadCSV(`movimentacoes_${dataInicio}_${dataFim}.csv`, toCSV(rows));
  };

  const exportarPorCategoria = () => {
    const rows = porCategoria.map((c) => ({
      Tipo: c.tipo,
      Categoria: c.nome,
      Total: c.total.toFixed(2).replace(".", ","),
    }));
    downloadCSV(`por_categoria_${dataInicio}_${dataFim}.csv`, toCSV(rows));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
              <FileBarChart className="h-6 w-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Relatórios Financeiros
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium pl-14">
            Análise detalhada de performance, categorias e fluxo de caixa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportarMovimentacoes} variant="outline" size="sm" className="gap-2 border-primary/20 hover:border-primary/50 transition-colors">
            <Download className="h-4 w-4" /> Exportar Movimentações
          </Button>
        </div>
      </div>

      {/* Filtros Estilizados - Novo Modelo Glassmorphism */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative flex flex-col gap-4 p-5 rounded-2xl border bg-card/40 backdrop-blur-md shadow-sm lg:flex-row lg:items-end border-white/10">
          <div className="grid grid-cols-2 gap-4 flex-1 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 pl-1">
                <div className="w-1 h-1 rounded-full bg-primary/50" /> Data Início
              </Label>
              <Input 
                type="date" 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-background/40 border-primary/10 focus:border-primary/40 focus:ring-primary/10 transition-all text-xs h-10 rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 pl-1">
                <div className="w-1 h-1 rounded-full bg-secondary/50" /> Data Fim
              </Label>
              <Input 
                type="date" 
                value={dataFim} 
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-background/40 border-primary/10 focus:border-primary/40 focus:ring-primary/10 transition-all text-xs h-10 rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 pl-1">
                <div className="w-1 h-1 rounded-full bg-accent/50" /> Conta Bancária
              </Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger className="bg-background/40 border-primary/10 focus:border-primary/40 focus:ring-primary/10 transition-all text-xs h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-primary/10">
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 pl-1">
                <div className="w-1 h-1 rounded-full bg-success/50" /> Status
              </Label>
              <Select value={statusFiltro} onValueChange={(v: any) => setStatusFiltro(v)}>
                <SelectTrigger className="bg-background/40 border-primary/10 focus:border-primary/40 focus:ring-primary/10 transition-all text-xs h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-primary/10">
                  <SelectItem value="pago">Somente Realizado</SelectItem>
                  <SelectItem value="all">Todo o Fluxo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Visual de Indicadores - Cards Elevados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="overflow-hidden border border-success/10 shadow-xl bg-gradient-to-br from-card via-card to-success/5 relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-success/10 rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-success/40" />
          <CardContent className="pt-8 pb-7">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-success/70 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Entradas Totais
                </p>
                {isLoading ? <Skeleton className="h-10 w-40" /> :
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-foreground tracking-tighter">{fmtBRL(entradas)}</span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1">Acumulado no período</span>
                  </div>
                }
              </div>
              <div className="p-4 rounded-2xl bg-success/10 text-success border border-success/20 group-hover:bg-success group-hover:text-white transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
                <TrendingUp className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-destructive/10 shadow-xl bg-gradient-to-br from-card via-card to-destructive/5 relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-destructive/10 rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-destructive/40" />
          <CardContent className="pt-8 pb-7">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-destructive/70 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  Saídas Totais
                </p>
                {isLoading ? <Skeleton className="h-10 w-40" /> :
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-foreground tracking-tighter">{fmtBRL(saidas)}</span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1">Custos e despesas</span>
                  </div>
                }
              </div>
              <div className="p-4 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 group-hover:bg-destructive group-hover:text-white transition-all duration-500 group-hover:-rotate-12 group-hover:scale-110">
                <TrendingDown className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "overflow-hidden border shadow-xl relative group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl rounded-3xl bg-gradient-to-br from-card via-card",
          resultado >= 0 
            ? "border-primary/10 to-primary/5 hover:shadow-primary/10" 
            : "border-orange-500/10 to-orange-500/5 hover:shadow-orange-500/10"
        )}>
          <div className={cn("absolute top-0 left-0 w-full h-1.5", resultado >= 0 ? "bg-primary/40" : "bg-orange-500/40")} />
          <CardContent className="pt-8 pb-7">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", resultado >= 0 ? "bg-primary" : "bg-orange-500")} />
                  Saldo do Período
                </p>
                {isLoading ? <Skeleton className="h-10 w-40" /> :
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-3xl font-black tracking-tighter",
                      resultado >= 0 ? "text-primary" : "text-orange-500"
                    )}>
                      {fmtBRL(resultado)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1">Resultado operacional</span>
                  </div>
                }
              </div>
              <div className={cn(
                "p-4 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg",
                resultado >= 0 
                  ? "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary group-hover:text-white" 
                  : "bg-orange-500/10 text-orange-500 border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white"
              )}>
                <Scale className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fluxo" className="w-full">
        <TabsList className="p-1 h-12 bg-muted/50 rounded-2xl border border-white/5 backdrop-blur-sm">
          <TabsTrigger value="fluxo" className="rounded-xl px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Fluxo</TabsTrigger>
          <TabsTrigger value="categorias" className="rounded-xl px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Categorias</TabsTrigger>
          <TabsTrigger value="contas" className="rounded-xl px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">Contas</TabsTrigger>
          <TabsTrigger value="dre" className="rounded-xl px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="space-y-4 pt-4 outline-none">
          <Card className={cn("shadow-xl border-none rounded-3xl bg-gradient-to-br from-card to-muted/5")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Fluxo Diário de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full rounded-2xl" /> :
                fluxoDiario.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <FileBarChart className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">Sem movimentações registradas neste período</p>
                  </div>
                ) : (
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fluxoDiario}>
                      <defs>
                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                      <XAxis 
                        dataKey="data" 
                        tickFormatter={(v) => fmtDate(v)?.slice(0, 5)} 
                        fontSize={11} 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} 
                        fontSize={11} 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '16px',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(v: any) => [fmtBRL(v), ""]} 
                        labelFormatter={(v) => fmtDate(v)} 
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Line 
                        type="monotone" 
                        dataKey="entradas" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={4} 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name="Entradas" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="saidas" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={4} 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name="Saídas" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="saldo" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4} 
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name="Resultado" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-6 pt-4 outline-none">
          <div className="flex justify-end">
            <Button onClick={exportarPorCategoria} variant="outline" size="sm" className="gap-2 rounded-xl border-primary/20 hover:bg-primary/5 transition-colors">
              <Download className="h-4 w-4" /> Exportar Dados de Categorias
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className={cn("shadow-xl border-none rounded-3xl overflow-hidden")}>
              <div className="h-1.5 w-full bg-destructive/20" />
              <CardHeader className="pb-0"><CardTitle className="text-lg font-black tracking-tight text-destructive">Despesas por Categoria</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {despesasCategoria.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <TrendingDown className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">Sem despesas registradas</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={despesasCategoria} 
                          dataKey="total" 
                          nameKey="nome" 
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={5}
                          label={(e: any) => `${e.nome}`}
                        >
                          {despesasCategoria.map((c, i) => <Cell key={i} fill={c.cor} className="stroke-background stroke-2" />)}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '16px'
                          }}
                          formatter={(v: any) => fmtBRL(v)} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className={cn("shadow-xl border-none rounded-3xl overflow-hidden")}>
              <div className="h-1.5 w-full bg-success/20" />
              <CardHeader className="pb-0"><CardTitle className="text-lg font-black tracking-tight text-success">Receitas por Categoria</CardTitle></CardHeader>
              <CardContent className="pt-0">
                {receitasCategoria.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <TrendingUp className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">Sem receitas registradas</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={receitasCategoria} 
                          dataKey="total" 
                          nameKey="nome" 
                          outerRadius={100}
                          innerRadius={60}
                          paddingAngle={5}
                          label={(e: any) => `${e.nome}`}
                        >
                          {receitasCategoria.map((c, i) => <Cell key={i} fill={c.cor} className="stroke-background stroke-2" />)}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '16px'
                          }}
                          formatter={(v: any) => fmtBRL(v)} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className={cn("shadow-md")}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porCategoria.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Sem dados
                    </TableCell></TableRow>
                  ) : porCategoria.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={c.tipo === "entrada" ? "default" : "destructive"} className="text-[10px]">
                          {c.tipo === "entrada" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.cor }} />
                          {c.nome}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${c.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                        {fmtBRL(c.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contas */}
        <TabsContent value="contas" className="space-y-4">
          <Card className={cn("shadow-md")}>
            <CardHeader><CardTitle className="text-base">Movimentação por conta</CardTitle></CardHeader>
            <CardContent>
              {porConta.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-12">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={porConta}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="conta" fontSize={11} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    <Legend />
                    <Bar dataKey="entradas" fill="hsl(var(--success))" name="Entradas" />
                    <Bar dataKey="saidas" fill="hsl(var(--destructive))" name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card className={cn("shadow-md")}>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Saídas</TableHead>
                    <TableHead className="text-right">Saldo do período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porConta.map((c) => (
                    <TableRow key={c.conta}>
                      <TableCell className="font-medium">{c.conta}</TableCell>
                      <TableCell className="text-right text-success">{fmtBRL(c.entradas)}</TableCell>
                      <TableCell className="text-right text-destructive">{fmtBRL(c.saidas)}</TableCell>
                      <TableCell className={`text-right font-semibold ${c.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmtBRL(c.saldo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRE */}
        <TabsContent value="dre">
          <Card className={cn("shadow-md")}>
            <CardHeader>
              <CardTitle className="text-base">DRE simplificado</CardTitle>
              <p className="text-xs text-muted-foreground">{fmtDate(dataInicio)} — {fmtDate(dataFim)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="font-semibold text-success border-b pb-1">(+) Receitas</div>
                {receitasCategoria.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm pl-4">
                    <span className="text-muted-foreground">{c.nome}</span>
                    <span>{fmtBRL(c.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-success">
                  <span>Total receitas</span><span>{fmtBRL(dre.receitas)}</span>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="font-semibold text-destructive border-b pb-1">(−) Despesas</div>
                {despesasCategoria.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm pl-4">
                    <span className="text-muted-foreground">{c.nome}</span>
                    <span>{fmtBRL(c.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-destructive">
                  <span>Total despesas</span><span>{fmtBRL(dre.despesas)}</span>
                </div>
              </div>
              <div className={`flex justify-between text-lg font-bold pt-3 border-t-2 ${
                dre.liquido >= 0 ? "text-primary" : "text-destructive"
              }`}>
                <span>(=) Resultado líquido</span>
                <span>{fmtBRL(dre.liquido)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
