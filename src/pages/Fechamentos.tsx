import { useMemo, useState } from "react";
import { Calculator, DollarSign, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFechamentos } from "@/hooks/useSupabaseData";

const statusConfig = {
  pendente: { label: "Pendente", variant: "outline" as const, icon: Clock },
  pago: { label: "Pago", variant: "default" as const, icon: CheckCircle2 },
  erro: { label: "Erro", variant: "destructive" as const, icon: AlertCircle },
};

function getQuinzena(ref: Date) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  if (d <= 15) return { inicio: new Date(y, m, 1), fim: new Date(y, m, 15) };
  return { inicio: new Date(y, m, 16), fim: new Date(y, m + 1, 0) };
}

function shiftQuinzena(q: { inicio: Date; fim: Date }, dir: -1 | 1) {
  const ref = new Date(q.inicio);
  if (dir === 1) ref.setDate(q.fim.getDate() + 1);
  else ref.setDate(q.inicio.getDate() - 1);
  return getQuinzena(ref);
}

const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export default function Fechamentos() {
  const { data: fechamentos = [], isLoading } = useFechamentos();

  const [refDate, setRefDate] = useState<Date>(new Date());
  const selecionada = useMemo(() => getQuinzena(refDate), [refDate]);
  const hojeQ = useMemo(() => getQuinzena(new Date()), []);
  const isAtual =
    selecionada.inicio.getTime() === hojeQ.inicio.getTime() &&
    selecionada.fim.getTime() === hojeQ.fim.getTime();
  const inicioISO = toISO(selecionada.inicio);
  const fimISO = toISO(selecionada.fim);

  const shift = (dir: -1 | 1) => {
    const next = shiftQuinzena(selecionada, dir);
    setRefDate(next.inicio);
  };

  const fechamentosQ = useMemo(
    () => fechamentos.filter((f: any) => f.periodo_inicio === inicioISO && f.periodo_fim === fimISO),
    [fechamentos, inicioISO, fimISO],
  );

  const totalPendente = fechamentosQ.filter(f => f.status === 'pendente').reduce((s, f) => s + f.valor_final, 0);
  const totalPago = fechamentosQ.filter(f => f.status === 'pago').reduce((s, f) => s + f.valor_final, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Fechamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Fechamento quinzenal de pagamentos</p>
        </div>

        <Card className="shadow-md w-full sm:w-auto">
          <CardContent className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Quinzena anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 text-center flex-1 sm:min-w-[180px]">
              <p className="text-xs text-muted-foreground">Quinzena</p>
              <p className="text-sm font-semibold whitespace-nowrap">{fmt(selecionada.inicio)} — {fmt(selecionada.fim)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Próxima quinzena">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isAtual && (
              <Button variant="outline" size="sm" onClick={() => setRefDate(new Date())}>Hoje</Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button className="gap-2"><Calculator className="h-4 w-4" /> Gerar Fechamento</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-accent-foreground/80">Total Pendente</p>
                <p className="text-2xl font-bold text-accent-foreground">R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <Clock className="h-10 w-10 text-accent-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-secondary to-secondary/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-foreground/80">Total Pago</p>
                <p className="text-2xl font-bold text-secondary-foreground">R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-secondary-foreground/30" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Fechamentos da Quinzena</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : fechamentosQ.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum fechamento nesta quinzena.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Diárias</TableHead>
                  <TableHead>Vales</TableHead>
                  <TableHead>Reembolsos</TableHead>
                  <TableHead>Valor Final</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fechamentosQ.map((f) => {
                  const cfg = statusConfig[f.status] ?? statusConfig.pendente;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{(f.colaborador as any)?.nome ?? "—"}</TableCell>
                      <TableCell>R$ {f.total_diarias.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-destructive">- R$ {f.total_vales.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-success">+ R$ {f.total_reembolsos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="font-bold">R$ {f.valor_final.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="gap-1">
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {f.status === "pendente" && (
                          <Button size="sm" className="gap-1">
                            <DollarSign className="h-3 w-3" /> Pagar via PIX
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
