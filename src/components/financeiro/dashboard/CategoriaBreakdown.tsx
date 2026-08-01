import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtBRL } from "@/lib/financeiro";

export interface CategoriaSlice {
  nome: string;
  valor: number;
  cor: string;
}

export interface CategoriaBreakdownProps {
  data: CategoriaSlice[];
}

export function CategoriaBreakdown({ data }: CategoriaBreakdownProps) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  const top = data.slice(0, 7);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Para onde o dinheiro foi</CardTitle>
        <p className="text-xs text-muted-foreground">
          {total > 0 ? `${fmtBRL(total)} em saídas · ${data.length} categoria(s)` : "Sem saídas no período"}
        </p>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Nada a exibir</p>
        ) : (
          <ul className="space-y-3">
            {top.map((c) => {
              const pct = total > 0 ? (c.valor / total) * 100 : 0;
              return (
                <li key={c.nome} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
                      <span className="truncate font-medium">{c.nome}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {fmtBRL(c.valor)} <span className="text-xs">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: c.cor }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
