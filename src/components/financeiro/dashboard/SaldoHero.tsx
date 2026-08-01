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
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="group relative overflow-hidden border-none shadow-2xl lg:col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80 transition-all group-hover:via-primary" />
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl transition-transform group-hover:scale-110" />
        <div className="absolute -left-10 -bottom-16 h-64 w-64 rounded-full bg-primary-foreground/5 blur-3xl" />
        
        <CardContent className="relative flex h-full flex-col justify-between p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/60">
                <Wallet className="h-3.5 w-3.5" /> Saldo Consolidado
              </p>
              <p className="mt-2 text-4xl font-black tracking-tighter text-primary-foreground sm:text-5xl">
                {fmtBRL(saldo)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-primary-foreground/10 px-2 py-0.5 text-[10px] font-medium text-primary-foreground/80">
                  {periodoLabel.split(" · ")[0]}
                </span>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-right backdrop-blur-md border border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/60">Resultado Líquido</p>
              <p className={cn("mt-1 text-2xl font-black tracking-tight text-primary-foreground")}>
                {positivo ? "+" : ""}{fmtBRL(resultado)}
              </p>
            </div>
          </div>

          <div className="-mx-6 -mb-6 mt-4 h-24">
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

      <div className="grid gap-4">
        <MiniStat
          label="Entradas"
          value={fmtBRL(entradas)}
          icon={TrendingUp}
          tone="success"
        />
        <MiniStat
          label="Saídas"
          value={fmtBRL(saidas)}
          icon={TrendingDown}
          tone="destructive"
        />
        <MiniStat
          label="Margem"
          value={entradas > 0 ? `${((resultado / entradas) * 100).toFixed(1)}%` : "—"}
          icon={Percent}
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
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
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
