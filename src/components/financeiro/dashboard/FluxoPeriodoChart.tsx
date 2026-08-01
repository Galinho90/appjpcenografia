import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtBRL } from "@/lib/financeiro";

export interface FluxoBucket {
  label: string;
  entradas: number;
  saidas: number;
}

export interface FluxoPeriodoChartProps {
  data: FluxoBucket[];
}

export function FluxoPeriodoChart({ data }: FluxoPeriodoChartProps) {
  return (
    <Card className="shadow-sm lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Entradas x Saídas</CardTitle>
        <p className="text-xs text-muted-foreground">Valores realizados no período selecionado</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Sem movimentações no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                formatter={(v: number) => fmtBRL(v)}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} maxBarSize={38} />
              <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
