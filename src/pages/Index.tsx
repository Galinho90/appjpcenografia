import { useMemo, useState } from "react";
import { Users, CalendarDays, DollarSign, CheckCircle2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useColaboradores, useDiarias, useFechamentos, useVales, useReembolsos } from "@/hooks/useSupabaseData";

// Compute the quinzena (1-15 or 16-end) for a given reference date
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
  } else {
    return isFirst
      ? new Date(inicio.getFullYear(), inicio.getMonth() - 1, 16)
      : new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  }
}

const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export default function Dashboard() {
  const [ref, setRef] = useState(new Date());
  const { inicio, fim } = useMemo(() => getQuinzena(ref), [ref]);
  const inicioISO = toISO(inicio);
  const fimISO = toISO(fim);

  const { data: colaboradores = [], isLoading: loadingC } = useColaboradores();
  const { data: diarias = [], isLoading: loadingD } = useDiarias();
  const { data: vales = [] } = useVales();
  const { data: reembolsos = [] } = useReembolsos();
  const { data: fechamentos = [], isLoading: loadingF } = useFechamentos();

  const isLoading = loadingC || loadingD || loadingF;

  // Filter by quinzena
  const diariasQ = diarias.filter(d => d.data >= inicioISO && d.data <= fimISO);
  const valesQ = vales.filter(v => v.data >= inicioISO && v.data <= fimISO);
  const reembolsosQ = reembolsos.filter(r => r.data >= inicioISO && r.data <= fimISO);
  const fechamentosQ = fechamentos.filter(f => f.periodo_inicio === inicioISO);

  const totalDiarias = diariasQ.reduce((s, d) => s + d.valor, 0);
  const totalVales = valesQ.reduce((s, v) => s + v.valor, 0);
  const totalReembolsos = reembolsosQ.reduce((s, r) => s + r.valor, 0);

  const totalPagoQ = fechamentosQ
    .filter(f => f.status === 'pago')
    .reduce((s, f) => s + Number(f.valor_final), 0);
  const totalAPagar = totalDiarias - totalVales + totalReembolsos - totalPagoQ;
  const totalPendente = Math.max(totalAPagar, 0);

  const fmtBRL = (n: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const stats = [
    {
      title: "Colaboradores Ativos",
      value: colaboradores.filter(c => c.ativo).length,
      icon: Users,
      gradient: "from-primary to-primary/70",
    },
    {
      title: "Diárias na Quinzena",
      value: diariasQ.length,
      icon: CalendarDays,
      gradient: "from-secondary to-secondary/70",
    },
    {
      title: "Total Pendente",
      value: `R$ ${fmtBRL(totalPendente)}`,
      icon: DollarSign,
      gradient: "from-accent to-accent/70",
    },
    {
      title: "Pagamentos Realizados",
      value: `R$ ${fmtBRL(totalPagoQ)}`,
      icon: CheckCircle2,
      gradient: "from-info to-info/70",
    },
  ];

  const funcaoCounts = colaboradores.reduce<Record<string, number>>((acc, c) => {
    acc[c.funcao || "Outros"] = (acc[c.funcao || "Outros"] || 0) + 1;
    return acc;
  }, {});
  const colors = ["hsl(263,70%,50%)", "hsl(160,60%,45%)", "hsl(38,92%,50%)", "hsl(210,90%,55%)", "hsl(340,70%,50%)"];
  const pieData = Object.entries(funcaoCounts).map(([name, value], i) => ({
    name, value, color: colors[i % colors.length],
  }));

  const isCurrentQuinzena = useMemo(() => {
    const now = getQuinzena(new Date());
    return toISO(now.inicio) === inicioISO;
  }, [inicioISO]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da operação</p>
        </div>

        <Card className="shadow-md">
          <CardContent className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" onClick={() => setRef(shiftQuinzena(ref, -1))} aria-label="Quinzena anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 text-center min-w-[180px]">
              <p className="text-xs text-muted-foreground">Quinzena</p>
              <p className="text-sm font-semibold">{fmt(inicio)} — {fmt(fim)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setRef(shiftQuinzena(ref, 1))} aria-label="Próxima quinzena">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentQuinzena && (
              <Button variant="outline" size="sm" onClick={() => setRef(new Date())}>Hoje</Button>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="overflow-hidden border-none shadow-lg">
              <div className={`bg-gradient-to-br ${stat.gradient} p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary-foreground/80">{stat.title}</p>
                    <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className="h-10 w-10 text-primary-foreground/30" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Totais da Quinzena
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalDiarias + totalVales + totalReembolsos === 0 ? (
              <p className="text-muted-foreground text-center py-10">Sem lançamentos nesta quinzena</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[{
                  name: `${fmt(inicio)} — ${fmt(fim)}`,
                  diarias: totalDiarias,
                  vales: totalVales,
                  reembolsos: totalReembolsos,
                }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(250,15%,90%)" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="diarias" name="Diárias" fill="hsl(263,70%,50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vales" name="Vales" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reembolsos" name="Reembolsos" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Por Função
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">Sem colaboradores</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
