import { useMemo, useState } from "react";
import { FileBarChart, Download, ChevronLeft, ChevronRight, DollarSign, Clock, CheckCircle2, Users, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useColaboradores, useFechamentos } from "@/hooks/useSupabaseData";
import { getStatusBadge } from "@/lib/statusBadge";

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
const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Relatorios() {
  const { data: colaboradores = [] } = useColaboradores();
  const { data: fechamentos = [], isLoading } = useFechamentos();

  const [refDate, setRefDate] = useState<Date>(new Date());
  const [colaboradorId, setColaboradorId] = useState<string>("all");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");

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

  const linhas = useMemo(
    () =>
      fechamentos
        .filter((f: any) => f.periodo_inicio === inicioISO && f.periodo_fim === fimISO)
        .filter((f: any) => colaboradorId === "all" || f.colaborador_id === colaboradorId)
        .filter((f: any) => statusFiltro === "all" || f.status === statusFiltro)
        .filter((f: any) => !(f.status === "pendente" && Math.abs(Number(f.valor_final) || 0) < 0.005))
        .slice()
        .sort((a: any, b: any) =>
          ((a.colaborador as any)?.nome ?? "").localeCompare(
            (b.colaborador as any)?.nome ?? "",
            "pt-BR",
            { sensitivity: "base" },
          ),
        ),
    [fechamentos, inicioISO, fimISO, colaboradorId, statusFiltro],
  );

  const tot = linhas.reduce(
    (acc, f: any) => {
      acc.diarias += Number(f.total_diarias) || 0;
      acc.vales += Number(f.total_vales) || 0;
      acc.reembolsos += Number(f.total_reembolsos) || 0;
      acc.final += Number(f.valor_final) || 0;
      if (f.status === "pago") acc.pago += Number(f.valor_final) || 0;
      else acc.pendente += Number(f.valor_final) || 0;
      return acc;
    },
    { diarias: 0, vales: 0, reembolsos: 0, final: 0, pago: 0, pendente: 0 },
  );

  const exportCSV = () => {
    const header = ["Colaborador", "Diárias", "Vales", "Reembolsos", "Valor Final", "Status"];
    const rows = linhas.map((f: any) => [
      (f.colaborador as any)?.nome ?? "—",
      Number(f.total_diarias).toFixed(2).replace(".", ","),
      Number(f.total_vales).toFixed(2).replace(".", ","),
      Number(f.total_reembolsos).toFixed(2).replace(".", ","),
      Number(f.valor_final).toFixed(2).replace(".", ","),
      f.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${inicioISO}_a_${fimISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Relatório quinzenal por colaborador
          </p>
        </div>

        <Card className="shadow-md w-full sm:w-auto">
          <CardContent className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Quinzena anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 text-center flex-1 sm:min-w-[180px]">
              <p className="text-xs text-muted-foreground">Quinzena</p>
              <p className="text-sm font-semibold whitespace-nowrap">
                {fmt(selecionada.inicio)} — {fmt(selecionada.fim)}
              </p>
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

      <Card className="shadow-md print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex items-end justify-end gap-2 flex-wrap">
              <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={!linhas.length}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button className="gap-2" onClick={exportPDF} disabled={!linhas.length}>
                <Printer className="h-4 w-4" /> Imprimir / PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-primary-foreground/80">Colaboradores</p>
                <p className="text-2xl font-bold text-primary-foreground">{linhas.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-secondary to-secondary/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary-foreground/80">Total Final</p>
                <p className="text-2xl font-bold text-secondary-foreground">{fmtBRL(tot.final)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-secondary-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-accent-foreground/80">Pendente</p>
                <p className="text-2xl font-bold text-accent-foreground">{fmtBRL(tot.pendente)}</p>
              </div>
              <Clock className="h-8 w-8 text-accent-foreground/30" />
            </div>
          </div>
        </Card>
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/80">Pago</p>
                <p className="text-2xl font-bold text-white">{fmtBRL(tot.pago)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-white/40" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>
            Resumo da Quinzena {fmt(selecionada.inicio)} — {fmt(selecionada.fim)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : linhas.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nenhum fechamento encontrado para os filtros selecionados.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {linhas.map((f: any) => {
                  const cfg = getStatusBadge(f.status);
                  const Icon = cfg.icon;
                  return (
                    <div key={f.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{(f.colaborador as any)?.nome ?? "—"}</span>
                        <Badge className={`gap-1 text-xs ${cfg.className}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-right">Diárias: <span className="font-medium">{fmtBRL(f.total_diarias)}</span></div>
                        <div className="text-right text-destructive">Vales: - {fmtBRL(f.total_vales)}</div>
                        <div className="text-right text-success">Reemb.: + {fmtBRL(f.total_reembolsos)}</div>
                        <div className="text-right font-bold">Final: {fmtBRL(f.valor_final)}</div>
                      </div>
                    </div>
                  );
                })}
                <div className="p-3 space-y-2 bg-muted/50">
                  <div className="font-semibold text-sm">Totais</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-right font-semibold">Diárias: {fmtBRL(tot.diarias)}</div>
                    <div className="text-right font-semibold text-destructive">Vales: - {fmtBRL(tot.vales)}</div>
                    <div className="text-right font-semibold text-success">Reemb.: + {fmtBRL(tot.reembolsos)}</div>
                    <div className="text-right font-bold">Final: {fmtBRL(tot.final)}</div>
                  </div>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Diárias</TableHead>
                      <TableHead className="text-right">Vales</TableHead>
                      <TableHead className="text-right">Reembolsos</TableHead>
                      <TableHead className="text-right">Valor Final</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((f: any) => {
                      const cfg = getStatusBadge(f.status);
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{(f.colaborador as any)?.nome ?? "—"}</TableCell>
                          <TableCell className="text-right">{fmtBRL(f.total_diarias)}</TableCell>
                          <TableCell className="text-right text-destructive">- {fmtBRL(f.total_vales)}</TableCell>
                          <TableCell className="text-right text-success">+ {fmtBRL(f.total_reembolsos)}</TableCell>
                          <TableCell className="text-right font-bold">{fmtBRL(f.valor_final)}</TableCell>
                          <TableCell>
                            <Badge className={`gap-1 ${cfg.className}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-semibold">Totais</TableCell>
                      <TableCell className="text-right font-semibold">{fmtBRL(tot.diarias)}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">- {fmtBRL(tot.vales)}</TableCell>
                      <TableCell className="text-right font-semibold text-success">+ {fmtBRL(tot.reembolsos)}</TableCell>
                      <TableCell className="text-right font-bold">{fmtBRL(tot.final)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
