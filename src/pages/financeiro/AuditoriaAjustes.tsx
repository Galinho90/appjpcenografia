import { useMemo, useState } from "react";
import { History, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditoriaAjustes, labelCampo, labelTabela } from "@/hooks/useAuditoria";
import { fmtBRL } from "@/lib/financeiro";

const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

export default function AuditoriaAjustes() {
  const [filters, setFilters] = useState({ tabela: "all", dataInicio: "", dataFim: "" });
  const { data: registros = [], isLoading } = useAuditoriaAjustes(filters);

  const totalImpacto = useMemo(
    () =>
      registros.reduce(
        (soma, r) => soma + ((Number(r.valor_novo) || 0) - (Number(r.valor_anterior) || 0)),
        0
      ),
    [registros]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <History className="h-6 w-6 text-primary" aria-hidden="true" />
            Auditoria de Ajustes
          </h1>
          <p className="text-sm text-muted-foreground">
            Histórico de alterações manuais de valores em fechamentos e movimentações financeiras.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="aud-tabela" className="text-xs text-muted-foreground">Origem</Label>
            <Select value={filters.tabela} onValueChange={(v) => setFilters((f) => ({ ...f, tabela: v }))}>
              <SelectTrigger id="aud-tabela" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                <SelectItem value="fechamentos">Fechamentos</SelectItem>
                <SelectItem value="movimentacoes_financeiras">Movimentações financeiras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="aud-inicio" className="text-xs text-muted-foreground">Data início</Label>
            <Input
              id="aud-inicio"
              type="date"
              className="w-[160px]"
              value={filters.dataInicio}
              onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="aud-fim" className="text-xs text-muted-foreground">Data fim</Label>
            <Input
              id="aud-fim"
              type="date"
              className="w-[160px]"
              value={filters.dataFim}
              onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {registros.length} ajuste(s)
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Impacto líquido:{" "}
            <strong className={totalImpacto >= 0 ? "text-secondary" : "text-destructive"}>
              {fmtBRL(totalImpacto)}
            </strong>
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`sk-${i}`} className="h-10 w-full" />
              ))}
            </div>
          ) : registros.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum ajuste registrado no período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead className="text-right">De</TableHead>
                    <TableHead className="text-right">Para</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((r) => {
                    const diff = (Number(r.valor_novo) || 0) - (Number(r.valor_anterior) || 0);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(r.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{labelTabela(r.tabela)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-sm">
                          {r.descricao_registro ?? r.registro_id}
                        </TableCell>
                        <TableCell className="text-sm">{labelCampo(r.campo)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {fmtBRL(Number(r.valor_anterior) || 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {fmtBRL(Number(r.valor_novo) || 0)}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm font-semibold ${diff >= 0 ? "text-secondary" : "text-destructive"}`}
                        >
                          {diff >= 0 ? "+" : ""}
                          {fmtBRL(diff)}
                        </TableCell>
                        <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                          {r.motivo ?? <span className="italic">não informado</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
