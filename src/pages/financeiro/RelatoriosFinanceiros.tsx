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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <FileBarChart className="h-7 w-7 text-primary" /> Relatórios Financeiros
          </h1>
          <p className="text-sm text-muted-foreground">Analise entradas, saídas e resultado consolidado</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportarMovimentacoes} variant="outline" size="sm" className="gap-2 border-primary/20 hover:border-primary/50 transition-colors">
            <Download className="h-4 w-4" /> Exportar Movimentações
          </Button>
        </div>
      </div>

      {/* Filtros Estilizados */}
      <div className="flex flex-col gap-4 p-4 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm lg:flex-row lg:items-end">
        <div className="grid grid-cols-2 gap-3 flex-1 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Data Início</Label>
            <div className="relative">
              <Input 
                type="date" 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all text-xs h-9" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Data Fim</Label>
            <Input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all text-xs h-9" 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Conta Bancária</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className="bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Status</Label>
            <Select value={statusFiltro} onValueChange={(v: any) => setStatusFiltro(v)}>
              <SelectTrigger className="bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pago">Somente Realizado</SelectItem>
                <SelectItem value="all">Todo o Fluxo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Resumo Visual de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-success/5 relative group transition-all hover:shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-success opacity-70" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Entradas Totais</p>
                {isLoading ? <Skeleton className="h-8 w-32" /> :
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-success tracking-tight">{fmtBRL(entradas)}</span>
                  </div>
                }
              </div>
              <div className="p-3 rounded-xl bg-success/10 text-success group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-destructive/5 relative group transition-all hover:shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-destructive opacity-70" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Saídas Totais</p>
                {isLoading ? <Skeleton className="h-8 w-32" /> :
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-destructive tracking-tight">{fmtBRL(saidas)}</span>
                  </div>
                }
              </div>
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive group-hover:scale-110 transition-transform">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "overflow-hidden border-none shadow-md relative group transition-all hover:shadow-lg bg-gradient-to-br",
          resultado >= 0 ? "from-card to-primary/5" : "from-card to-orange-500/5"
        )}>
          <div className={cn("absolute top-0 left-0 w-1 h-full opacity-70", resultado >= 0 ? "bg-primary" : "bg-orange-500")} />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Saldo do Período</p>
                {isLoading ? <Skeleton className="h-8 w-32" /> :
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-2xl font-black tracking-tight",
                      resultado >= 0 ? "text-primary" : "text-orange-500"
                    )}>
                      {fmtBRL(resultado)}
                    </span>
                  </div>
                }
              </div>
              <div className={cn(
                "p-3 rounded-xl group-hover:scale-110 transition-transform",
                resultado >= 0 ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500"
              )}>
                <Scale className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fluxo" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        {/* Fluxo */}
        <TabsContent value="fluxo" className="space-y-4">
          <Card className={cn("shadow-md")}>
            <CardHeader><CardTitle className="text-base">Fluxo diário</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-72 w-full" /> :
                fluxoDiario.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-12">Sem dados no período</p>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={fluxoDiario}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="data" tickFormatter={(v) => fmtDate(v)?.slice(0, 5)} fontSize={11} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} labelFormatter={(v) => fmtDate(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="entradas" stroke="hsl(var(--success))" strokeWidth={2} name="Entradas" />
                    <Line type="monotone" dataKey="saidas" stroke="hsl(var(--destructive))" strokeWidth={2} name="Saídas" />
                    <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} name="Resultado" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categorias */}
        <TabsContent value="categorias" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={exportarPorCategoria} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={cn("shadow-md")}>
              <CardHeader><CardTitle className="text-base text-destructive">Despesas por categoria</CardTitle></CardHeader>
              <CardContent>
                {despesasCategoria.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-12">Sem despesas no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={despesasCategoria} dataKey="total" nameKey="nome" outerRadius={90}
                        label={(e: any) => `${e.nome}: ${((e.percent ?? 0) * 100).toFixed(0)}%`}>
                        {despesasCategoria.map((c, i) => <Cell key={i} fill={c.cor} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className={cn("shadow-md")}>
              <CardHeader><CardTitle className="text-base text-success">Receitas por categoria</CardTitle></CardHeader>
              <CardContent>
                {receitasCategoria.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-12">Sem receitas no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={receitasCategoria} dataKey="total" nameKey="nome" outerRadius={90}
                        label={(e: any) => `${e.nome}: ${((e.percent ?? 0) * 100).toFixed(0)}%`}>
                        {receitasCategoria.map((c, i) => <Cell key={i} fill={c.cor} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="shadow-md">
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
          <Card className="shadow-md">
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
          <Card className="shadow-md">
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
          <Card className="shadow-md">
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
