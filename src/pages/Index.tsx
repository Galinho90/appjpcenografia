import { useMemo, useState } from "react";
import { Users, CalendarDays, DollarSign, CheckCircle2, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useColaboradores, useDiarias, useFechamentos, useLancamentos } from "@/hooks/useSupabaseData";
import { PageHeader } from "@/components/PageHeader";
import { QuinzenaSelector } from "@/components/QuinzenaSelector";

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
  const { data: lancamentos = [], isLoading: loadingL } = useLancamentos();
  const { data: fechamentos = [], isLoading: loadingF } = useFechamentos();

  const isLoading = loadingC || loadingD || loadingL || loadingF;

  // Filter by quinzena
  const diariasQ = diarias.filter(d => d.data >= inicioISO && d.data <= fimISO);
  const lancamentosQ = lancamentos.filter(l => l.data >= inicioISO && l.data <= fimISO);
  const fechamentosQ = fechamentos.filter(f => f.periodo_inicio === inicioISO);

  // Saldo dos lançamentos: créditos somam, débitos subtraem
  const totalCreditos = lancamentosQ
    .filter(l => l.categoria?.tipo === "C")
    .reduce((s, l) => s + l.valor, 0);
  const totalDebitos = lancamentosQ
    .filter(l => l.categoria?.tipo === "D")
    .reduce((s, l) => s + l.valor, 0);
  const saldoLancamentos = totalCreditos - totalDebitos;

  // Pagamentos de fechamento já são registrados como lançamentos de débito,
  // então totalDebitos já reflete tudo que foi pago + vales.
  const totalPagoQ = totalDebitos;

  // Total pendente = créditos − débitos
  const totalPendente = Math.max(totalCreditos - totalPagoQ, 0);

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
      title: "Lançamentos na Quinzena",
      value: lancamentosQ.length,
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Dashboard" description="Visão geral da operação" />


        <QuinzenaSelector
          className="w-full sm:w-[300px]"
          inicio={inicio}
          fim={fim}
          isCurrent={isCurrentQuinzena}
          onShift={(dir) => setRef(shiftQuinzena(ref, dir))}
          onToday={() => setRef(new Date())}
        />

      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="overflow-hidden border-none shadow-premium-sm">
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
        <Card className="lg:col-span-2 shadow-premium-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Totais da Quinzena
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalCreditos + totalDebitos === 0 ? (
              <p className="text-muted-foreground text-center py-10">Sem lançamentos nesta quinzena</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={[{
                  name: `${fmt(inicio)} — ${fmt(fim)}`,
                  creditos: totalCreditos,
                  debitos: totalDebitos,
                  saldo: saldoLancamentos,
                }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(250,15%,90%)" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="creditos" name="Créditos" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debitos" name="Débitos" fill="hsl(0,70%,55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saldo" name="Saldo" fill="hsl(263,70%,50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-premium-sm">
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
