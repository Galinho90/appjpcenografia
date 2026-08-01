import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, ArrowRight, CalendarIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  useContasBancarias, useMovimentacoes, useSaldoContas,
} from "@/hooks/useFinanceiro";
import { fmtBRL, fmtDate } from "@/lib/financeiro";

export default function FinanceiroDashboard() {
  const { data: contas = [], isLoading: loadingContas } = useContasBancarias();
  const [contaId, setContaId] = useState<string>("all");

  const hoje = new Date();
  const [dataInicio, setDataInicio] = useState<Date>(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [dataFim, setDataFim] = useState<Date>(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));

  // Datas em ISO usando componentes locais (evita o shift de fuso do toISOString)
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const inicioStr = toISO(dataInicio);
  const fimStr = toISO(dataFim);

  // Saldo do caixa: soma TODAS as contas quando o filtro é "Todas as contas"
  const contasSelecionadas = contaId === "all" ? contas.map((c) => c.id) : [contaId];
  const hojeStrLocal = toISO(hoje);
  // Referência do saldo: nunca antes de hoje, para o card refletir o caixa real
  const saldoRef = fimStr > hojeStrLocal ? fimStr : hojeStrLocal;
  const { data: saldo = 0 } = useSaldoContas(contasSelecionadas, saldoRef);

  // Buscamos sem filtro de data e filtramos no cliente usando a data efetiva
  // (data_pagamento para pagos, data_vencimento para os demais)
  const { data: todasMovs = [], isLoading } = useMovimentacoes({
    contaId: contaId === "all" ? undefined : contaId,
  });

  const dataEfetiva = (m: typeof todasMovs[number]) =>
    m.status === "pago" ? (m.data_pagamento ?? m.data_vencimento) : m.data_vencimento;

  const movs = useMemo(
    () => todasMovs.filter((m) => {
      const d = dataEfetiva(m);
      return d ? d >= inicioStr && d <= fimStr : false;
    }),
    [todasMovs, inicioStr, fimStr],
  );

  const entradasPeriodo = movs.filter((m) => m.tipo === "entrada" && m.status === "pago").reduce((s, m) => s + m.valor, 0);
  const saidasPeriodo = movs.filter((m) => m.tipo === "saida" && m.status === "pago").reduce((s, m) => s + m.valor, 0);
  const resultadoPeriodo = entradasPeriodo - saidasPeriodo;

  // Próximos vencimentos (7 dias) — usamos a lista completa, não restrita ao período
  const hojeStr = hojeStrLocal;
  const em7Dias = toISO(new Date(hoje.getTime() + 7 * 24 * 3600 * 1000));
  const proximosVencimentos = todasMovs
    .filter((m) => m.status === "pendente" && m.data_vencimento && m.data_vencimento >= hojeStr && m.data_vencimento <= em7Dias)
    .sort((a, b) => (a.data_vencimento ?? "").localeCompare(b.data_vencimento ?? ""))
    .slice(0, 5);

  const atrasadas = todasMovs.filter(
    (m) => m.status === "pendente" && m.data_vencimento && m.data_vencimento < hojeStr
  );

  // Fluxo de caixa mensal no período filtrado
  const fluxoMensal = useMemo(() => {
    const map = new Map<string, { mes: string; entradas: number; saidas: number; resultado: number }>();
    movs
      .filter((m) => m.status === "pago")
      .forEach((m) => {
        const d = new Date(m.data_pagamento ?? m.data_vencimento ?? "");
        if (isNaN(d.getTime())) return;
        const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
        if (!map.has(key)) {
          map.set(key, { mes: key, entradas: 0, saidas: 0, resultado: 0 });
        }
        const cur = map.get(key)!;
        if (m.tipo === "entrada") cur.entradas += m.valor;
        else if (m.tipo === "saida") cur.saidas += m.valor;
        cur.resultado = cur.entradas - cur.saidas;
      });
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [movs]);

  // Gastos por categoria (período filtrado)
  const gastosPorCategoria = useMemo(() => {
    const map = new Map<string, { nome: string; valor: number; cor: string }>();
    movs
      .filter((m) => m.tipo === "saida" && m.status === "pago" && m.categoria)
      .forEach((m) => {
        const c = m.categoria!;
        const cur = map.get(c.id) || { nome: c.nome, valor: 0, cor: c.cor };
        cur.valor += m.valor;
        map.set(c.id, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
  }, [movs]);

  const cards = [
    {
      title: "Saldo Atual",
      value: fmtBRL(saldo),
      icon: Wallet,
      gradient: "from-primary to-primary/70",
    },
    {
      title: "Entradas (período)",
      value: fmtBRL(entradasPeriodo),
      icon: TrendingUp,
      gradient: "from-success to-success/70",
    },
    {
      title: "Saídas (período)",
      value: fmtBRL(saidasPeriodo),
      icon: TrendingDown,
      gradient: "from-destructive to-destructive/70",
    },
    {
      title: "Resultado (período)",
      value: fmtBRL(resultadoPeriodo),
      icon: TrendingUp,
      gradient: resultadoPeriodo >= 0 ? "from-secondary to-secondary/70" : "from-destructive to-destructive/70",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Dashboard de fluxo de caixa e contas bancárias</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataInicio} onSelect={(d) => d && setDataInicio(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataFim ? format(dataFim, "dd/MM/yyyy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataFim} onSelect={(d) => d && setDataFim(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>

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
            <CardTitle>Fluxo de Caixa — período</CardTitle>
          </CardHeader>
          <CardContent>
            {fluxoMensal.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Sem dados no período</p>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Gastos por Categoria (período)</CardTitle>
          </CardHeader>
          <CardContent>
            {gastosPorCategoria.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Sem saídas no período</p>
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
            {fluxoMensal.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Sem dados no período</p>
            ) : (
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
            )}
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
