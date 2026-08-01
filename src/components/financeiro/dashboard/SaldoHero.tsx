import { TrendingUp, TrendingDown, Wallet, Percent, Scale } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { fmtBRL, fmtDate } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

export interface SaldoPoint {
  dia: string;
  saldo: number;
}

export interface SaldoHeroProps {
  saldo: number;
  entradas: number
  saidas: number;
  resultado: number;
  serie: SaldoPoint[];
  periodoLabel: string;
}

export function SaldoHero({ saldo, entradas, saidas, resultado, serie, periodoLabel }: SaldoHeroProps) {
  const positivo = resultado >= 0;

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
      <Card className="relative overflow-hidden border-none shadow-premium-sm lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/70" />
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-primary-foreground/10 blur-2xl" />
        <CardContent className="relative flex flex-col p-5 pt-6 sm:p-6 sm:pt-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-primary-foreground/70 sm:text-xs">
                <Wallet className="h-3.5 w-3.5 shrink-0" /> Saldo em caixa
              </p>
              <p className="mt-1.5 break-words text-2xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-3xl lg:text-4xl">
                {fmtBRL(saldo)}
              </p>
              <p className="mt-1.5 text-[11px] text-primary-foreground/70 sm:text-xs">{periodoLabel}</p>
            </div>
            <div className="w-full rounded-xl bg-primary-foreground/10 px-3 py-2 sm:w-auto sm:text-right">
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70">Resultado</p>
              <p className="break-words text-base font-semibold text-primary-foreground sm:text-lg">
                {positivo ? "+" : ""}{fmtBRL(resultado)}
              </p>
            </div>
          </div>

          <div className="-mx-5 -mb-5 mt-6 h-20 sm:-mx-6 sm:-mb-6 sm:h-24">

            {serie.length > 1 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="heroSaldo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary-foreground))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary-foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dia" hide />
                  <Tooltip
                    formatter={(v: number) => [fmtBRL(v), "Saldo"]}
                    labelFormatter={(l) => (typeof l === "string" ? fmtDate(l) : "")}
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "none" }}
                  />

                  <Area
                    type="monotone"
                    dataKey="saldo"
                    stroke="hsl(var(--primary-foreground))"
                    strokeWidth={2}
                    fill="url(#heroSaldo)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:grid-rows-3">
        <MiniStat
          label="Entradas no período"
          value={fmtBRL(entradas)}
          icon={TrendingUp}
          tone="success"
        />
        <MiniStat
          label="Saídas no período"
          value={fmtBRL(saidas)}
          icon={TrendingDown}
          tone="destructive"
        />
        <MiniStat
          label="Margem do período"
          value={entradas > 0 ? `${((resultado / entradas) * 100).toFixed(1)}%` : "—"}
          icon={Scale}
          tone={positivo ? "secondary" : "destructive"}
        />
      </div>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive" | "secondary";
}

const TONES: Record<MiniStatProps["tone"], string> = {
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  secondary: "bg-secondary/10 text-secondary",
};

function MiniStat({ label, value, icon: Icon, tone }: MiniStatProps) {
  return (
    <Card className="h-full shadow-premium-sm">
      <CardContent className="flex h-full items-center gap-3 p-4 sm:p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
