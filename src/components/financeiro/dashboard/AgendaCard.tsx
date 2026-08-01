import { Link } from "react-router-dom";
import { AlertCircle, CalendarClock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtBRL, fmtDate } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

export interface AgendaItem {
  id: string;
  descricao: string | null;
  tipo: string;
  valor: number;
  data_vencimento: string | null;
  categoria?: { nome: string } | null;
}

export interface AgendaCardProps {
  proximos: AgendaItem[];
  atrasadas: AgendaItem[];
}

export function AgendaCard({ proximos, atrasadas }: AgendaCardProps) {
  const totalAtraso = atrasadas.reduce((s, m) => s + m.valor, 0);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="flex-row items-center justify-between pb-6">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <CalendarClock className="h-5 w-5 text-primary" /> Agenda Financeira
          </CardTitle>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Próximos Vencimentos (7 dias)</p>
        </div>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs font-bold uppercase tracking-tighter">
          <Link to="/financeiro/contas-pagar">Ver tudo <ArrowRight className="ml-1.5 h-3 w-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {atrasadas.length > 0 && (
          <Link
            to="/financeiro/contas-pagar"
            className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-destructive">
                {atrasadas.length} lançamento(s) em atraso
              </p>
              <p className="text-xs text-muted-foreground">Total {fmtBRL(totalAtraso)}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-destructive" />
          </Link>
        )}

        {proximos.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum vencimento próximo</p>
        ) : (
          <ul className="divide-y">
            {proximos.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.descricao ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(m.data_vencimento)} · {m.categoria?.nome ?? "Sem categoria"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
                    m.tipo === "entrada" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                  )}
                >
                  {m.tipo === "entrada" ? "+" : "−"} {fmtBRL(m.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
