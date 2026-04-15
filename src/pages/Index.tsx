import { Users, CalendarDays, DollarSign, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useColaboradores, useDiarias, useFechamentos } from "@/hooks/useSupabaseData";

export default function Dashboard() {
  const { data: colaboradores = [], isLoading: loadingC } = useColaboradores();
  const { data: diarias = [], isLoading: loadingD } = useDiarias();
  const { data: fechamentos = [], isLoading: loadingF } = useFechamentos();

  const isLoading = loadingC || loadingD || loadingF;

  const stats = [
    {
      title: "Colaboradores Ativos",
      value: colaboradores.filter(c => c.ativo).length,
      icon: Users,
      gradient: "from-primary to-primary/70",
    },
    {
      title: "Diárias do Mês",
      value: diarias.length,
      icon: CalendarDays,
      gradient: "from-secondary to-secondary/70",
    },
    {
      title: "Total Pendente",
      value: `R$ ${fechamentos.filter(f => f.status === 'pendente').reduce((s, f) => s + f.valor_final, 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      gradient: "from-accent to-accent/70",
    },
    {
      title: "Pagamentos Realizados",
      value: fechamentos.filter(f => f.status === 'pago').length,
      icon: CheckCircle2,
      gradient: "from-info to-info/70",
    },
  ];

  // Group colaboradores by funcao for pie chart
  const funcaoCounts = colaboradores.reduce<Record<string, number>>((acc, c) => {
    acc[c.funcao || "Outros"] = (acc[c.funcao || "Outros"] || 0) + 1;
    return acc;
  }, {});
  const colors = ["hsl(263,70%,50%)", "hsl(160,60%,45%)", "hsl(38,92%,50%)", "hsl(210,90%,55%)", "hsl(340,70%,50%)"];
  const pieData = Object.entries(funcaoCounts).map(([name, value], i) => ({
    name, value, color: colors[i % colors.length],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da operação</p>
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
              Custos por Quinzena
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fechamentos.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">Sem dados de fechamento ainda</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={fechamentos.map(f => ({
                  name: `${new Date(f.periodo_inicio).toLocaleDateString("pt-BR")}`,
                  diarias: f.total_diarias,
                  vales: f.total_vales,
                  reembolsos: f.total_reembolsos,
                }))}>
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
