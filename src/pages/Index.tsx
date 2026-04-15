import { Users, CalendarDays, DollarSign, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockColaboradores, mockDiarias, mockFechamentos, mockVales, mockReembolsos } from "@/data/mock";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const barData = [
  { name: "1ª Quinz Mar", diarias: 3200, vales: 400, reembolsos: 200 },
  { name: "2ª Quinz Mar", diarias: 4100, vales: 600, reembolsos: 350 },
  { name: "1ª Quinz Abr", diarias: 2830, vales: 250, reembolsos: 130 },
];

const pieData = [
  { name: "Montador", value: 2, color: "hsl(263, 70%, 50%)" },
  { name: "Eletricista", value: 1, color: "hsl(160, 60%, 45%)" },
  { name: "Pintor", value: 1, color: "hsl(38, 92%, 50%)" },
  { name: "Auxiliar", value: 1, color: "hsl(210, 90%, 55%)" },
];

const stats = [
  {
    title: "Colaboradores Ativos",
    value: mockColaboradores.filter(c => c.ativo).length,
    icon: Users,
    gradient: "from-primary to-primary/70",
  },
  {
    title: "Diárias do Mês",
    value: mockDiarias.length,
    icon: CalendarDays,
    gradient: "from-secondary to-secondary/70",
  },
  {
    title: "Total Pendente",
    value: `R$ ${mockFechamentos.filter(f => f.status === 'pendente').reduce((s, f) => s + f.valor_final, 0).toLocaleString('pt-BR')}`,
    icon: DollarSign,
    gradient: "from-accent to-accent/70",
  },
  {
    title: "Pagamentos Realizados",
    value: mockFechamentos.filter(f => f.status === 'pago').length,
    icon: CheckCircle2,
    gradient: "from-info to-info/70",
  },
];

const recentActivities = [
  { text: "Diária registrada para Carlos Silva", time: "Há 2h", icon: CalendarDays },
  { text: "Vale de R$ 100 para Carlos Silva", time: "Há 3h", icon: DollarSign },
  { text: "Reembolso de R$ 80 para João Santos", time: "Há 5h", icon: TrendingUp },
  { text: "Fechamento quinzenal gerado", time: "Há 1d", icon: CheckCircle2 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da operação</p>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Custos por Quinzena
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(250,15%,90%)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(250,15%,90%)' }}
                />
                <Bar dataKey="diarias" name="Diárias" fill="hsl(263,70%,50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vales" name="Vales" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reembolsos" name="Reembolsos" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <activity.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
