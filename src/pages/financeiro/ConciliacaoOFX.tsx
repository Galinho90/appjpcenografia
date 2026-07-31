import { useMemo, useState } from "react";
import { GitCompareArrows, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtBRL, fmtDate } from "@/lib/financeiro";
import { useColaboradores } from "@/hooks/useSupabaseData";
import {
  useConciliacaoFechamentos,
  CONCILIACAO_STATUS_LABEL,
  CONCILIACAO_STATUS_VARIANT,
  type ConciliacaoStatus,
} from "@/hooks/useConciliacao";

export default function ConciliacaoOFX() {
  const [filters, setFilters] = useState({
    dataInicio: "",
    dataFim: "",
    colaboradorId: "all",
    status: "all",
  });

  const { data: colaboradores = [] } = useColaboradores();
  const { data: itens = [], isLoading } = useConciliacaoFechamentos(filters);

  const resumo = useMemo(() => {
    const base = { ok: 0, divergente: 0, nao_conciliado: 0, sem_movimentacao: 0, nao_pago: 0 };
    let impacto = 0;
    for (const i of itens) {
      base[i.status] += 1;
      if (i.status === "divergente" || i.status === "sem_movimentacao") impacto += i.diferenca;
    }
    return { ...base, impacto };
  }, [itens]);

  const exportarCSV = () => {
    const linhas = [
      ["Colaborador", "Período", "Status", "Valor esperado", "Valor bancário", "Diferença", "Vínculo OFX", "Data pagamento"],
      ...itens.map((i) => [
        i.colaborador_nome,
        `${fmtDate(i.periodo_inicio)} a ${fmtDate(i.periodo_fim)}`,
        CONCILIACAO_STATUS_LABEL[i.status],
        i.valor_esperado.toFixed(2).replace(".", ","),
        i.valor_banco === null ? "" : i.valor_banco.toFixed(2).replace(".", ","),
        i.diferenca.toFixed(2).replace(".", ","),
        i.conciliado_ofx ? "Sim" : "Não",
        i.data_pagamento ? fmtDate(i.data_pagamento) : "",
      ]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "conciliacao-ofx-fechamentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards: { key: ConciliacaoStatus; label: string }[] = [
    { key: "ok", label: "Conciliados" },
    { key: "divergente", label: "Valor divergente" },
    { key: "sem_movimentacao", label: "Sem movimentação" },
    { key: "nao_conciliado", label: "Sem vínculo OFX" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <GitCompareArrows className="h-6 w-6 text-primary" aria-hidden="true" />
            Conciliação OFX × Fechamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Divergências por colaborador e período: valor esperado do fechamento contra o valor bancário.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="conc-inicio" className="text-xs text-muted-foreground">Período (fim) início</Label>
            <Input
              id="conc-inicio"
              type="date"
              className="w-[160px]"
              value={filters.dataInicio}
              onChange={(e) => setFilters((f) => ({ ...f, dataInicio: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conc-fim" className="text-xs text-muted-foreground">Período (fim) até</Label>
            <Input
              id="conc-fim"
              type="date"
              className="w-[160px]"
              value={filters.dataFim}
              onChange={(e) => setFilters((f) => ({ ...f, dataFim: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conc-colab" className="text-xs text-muted-foreground">Colaborador</Label>
            <Select
              value={filters.colaboradorId}
              onValueChange={(v) => setFilters((f) => ({ ...f, colaboradorId: v }))}
            >
              <SelectTrigger id="conc-colab" className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {colaboradores.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="conc-status" className="text-xs text-muted-foreground">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
              <SelectTrigger id="conc-status" className="w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(CONCILIACAO_STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportarCSV} disabled={itens.length === 0}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{resumo[c.key]}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impacto das divergências</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${resumo.impacto === 0 ? "text-foreground" : "text-destructive"}`}>
              {fmtBRL(resumo.impacto)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fechamentos analisados ({itens.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : itens.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum fechamento encontrado para os filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor esperado</TableHead>
                    <TableHead className="text-right">Valor bancário</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((i) => (
                    <TableRow key={i.fechamento_id}>
                      <TableCell className="font-medium">{i.colaborador_nome}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {fmtDate(i.periodo_inicio)} — {fmtDate(i.periodo_fim)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {i.data_pagamento ? fmtDate(i.data_pagamento) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmtBRL(i.valor_esperado)}</TableCell>
                      <TableCell className="text-right">
                        {i.valor_banco === null ? "—" : fmtBRL(i.valor_banco)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          Math.abs(i.diferenca) < 0.01 ? "text-muted-foreground" : "text-destructive"
                        }`}
                      >
                        {Math.abs(i.diferenca) < 0.01 ? "—" : fmtBRL(i.diferenca)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CONCILIACAO_STATUS_VARIANT[i.status]}>
                          {CONCILIACAO_STATUS_LABEL[i.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
