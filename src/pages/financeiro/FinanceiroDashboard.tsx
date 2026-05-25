import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  useContasBancarias, useMovimentacoes, useSaldoConta,
} from "@/hooks/useFinanceiro";
import { fmtBRL, fmtDate } from "@/lib/financeiro";

export default function FinanceiroDashboard() {
  const { data: contas = [], isLoading: loadingContas } = useContasBancarias();
  const [contaId, setContaId] = useState<string>("all");

  const contaSelecionada = contaId === "all" ? contas[0]?.id ?? null : contaId;
  const { data: saldo = 0 } = useSaldoConta(contaSelecionada);

  // Pull last 12 months of movimentações
  const hoje = new Date();
  const inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1).toISOString().slice(0, 10);
  const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0).toISOString().slice(0, 10);

  const { data: movs = [], isLoading } = useMovimentacoes({
    dataInicio: inicioPeriodo,
    dataFim: fimPeriodo,
    contaId: contaId === "all" ? undefined : contaId,
  });

  const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

  const movsMes = movs.filter(
    (m) =>
      (m.data_pagamento ?? m.data_vencimento ?? "") >= inicioMesAtual &&
      (m.data_pagamento ?? m.data_vencimento ?? "") <= fimMesAtual &&
      m.status === "pago"
  );

  const entradasMes = movsMes.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
  const saidasMes = movsMes.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
  const resultadoMes = entradasMes - saidasMes;

  // Próximos vencimentos (7 dias)
  const em7Dias = new Date(hoje.getTime() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const proximosVencimentos = movs
    .filter((m) => m.status === "pendente" && m.data_vencimento && m.data_vencimento >= hoje.toISOString().slice(0, 10) && m.data_vencimento <= em7Dias)
    .sort((a, b) => (a.data_vencimento ?? "").localeCompare(b.data_vencimento ?? ""))
    .slice(0, 5);

  const atrasadas = movs.filter(
    (m) => m.status === "pendente" && m.data_vencimento && m.data_vencimento < hoje.toISOString().slice(0, 10)
  );

  // Fluxo de caixa últimos 6 meses
  const fluxoMensal = useMemo(() => {
    const out: Array<{ mes: string; entradas: number; saidas: number; resultado: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ini = d.toISOString().slice(0, 10);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const inMonth = movs.filter(
        (m) =>
          m.status === "pago" &&
          (m.data_pagamento ?? m.data_vencimento ?? "") >= ini &&
          (m.data_pagamento ?? m.data_vencimento ?? "") <= fim
      );
      const e = inMonth.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
      const s = inMonth.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
      out.push({
        mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        entradas: e,
        saidas: s,
        resultado: e - s,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movs]);

  // Gastos por categoria (mês atual)
  const gastosPorCategoria = useMemo(() => {
    const map = new Map<string, { nome: string; valor: number; cor: string }>();
    movsMes
      .filter((m) => m.tipo === "saida" && m.categoria)
      .forEach((m) => {
        const c = m.categoria!;
        const cur = map.get(c.id) || { nome: c.nome, valor: 0, cor: c.cor };
        cur.valor += m.valor;
        map.set(c.id, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
  }, [movsMes]);

  const cards = [
    {
      title: "Saldo Atual",
      value: fmtBRL(saldo),
      icon: Wallet,
      gradient: "from-primary to-primary/70",
    },
    {
      title: "Entradas (mês)",
      value: fmtBRL(entradasMes),
      icon: TrendingUp,
      gradient: "from-success to-success/70",
    },
    {
      title: "Saídas (mês)",
      value: fmtBRL(saidasMes),
      icon: TrendingDown,
      gradient: "from-destructive to-destructive/70",
    },
    {
      title: "Resultado (mês)",
      value: fmtBRL(resultadoMes),
      icon: TrendingUp,
      gradient: resultadoMes >= 0 ? "from-secondary to-secondary/70" : "from-destructive to-destructive/70",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Dashboard de fluxo de caixa e contas bancárias</p>
        </div>
        <div className="flex gap-2">
          <Select value={contaId} onValueChange={setContaId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {contas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link to="/financeiro/movimentacoes">Ver movimentações <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {atrasadas.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">
                {atrasadas.length} lançamento(s) em atraso
              </p>
              <p className="text-sm text-muted-foreground">
                Total: {fmtBRL(atrasadas.reduce((s, m) => s + m.valor, 0))}
              </p>
            </div>
            <Button size="sm" variant="destructive" asChild>
              <Link to="/financeiro/contas-pagar">Ver detalhes</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading || loadingContas ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.title} className="overflow-hidden border-none shadow-lg">
              <div className={`bg-gradient-to-br ${c.gradient} p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-foreground/80">{c.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-primary-foreground">{c.value}</p>
                  </div>
                  <c.icon className="h-10 w-10 text-primary-foreground/30" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Fluxo de Caixa — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fluxoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke="hsl(var(--destructive))" strokeWidth={2} />
                <Line type="monotone" dataKey="resultado" name="Resultado" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Gastos por Categoria (mês)</CardTitle>
          </CardHeader>
          <CardContent>
            {gastosPorCategoria.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Sem saídas neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    dataKey="valor"
                    nameKey="nome"
                    label={(entry: any) => entry.nome}
                  >
                    {gastosPorCategoria.map((g, i) => (
                      <Cell key={i} fill={g.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Comparativo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fluxoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Próximos Vencimentos (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {proximosVencimentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum vencimento próximo</p>
            ) : (
              <ul className="space-y-2">
                {proximosVencimentos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{m.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence em {fmtDate(m.data_vencimento)} · {m.categoria?.nome ?? "—"}
                      </p>
                    </div>
                    <Badge variant={m.tipo === "entrada" ? "default" : "destructive"}>
                      {m.tipo === "entrada" ? "+" : "-"} {fmtBRL(m.valor)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
