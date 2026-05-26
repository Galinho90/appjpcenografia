import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { CheckCircle2, Calendar, AlertTriangle, Clock } from "lucide-react";
import {
  useMovimentacoes, useUpdateMovimentacao, type MovimentacaoFinanceira,
} from "@/hooks/useFinanceiro";
import { fmtBRL, fmtDate, todayISO } from "@/lib/financeiro";

export default function ContasPagar() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const { data: movs = [], isLoading } = useMovimentacoes({ status: "pendente" });
  const updateMutation = useUpdateMovimentacao();

  const hoje = todayISO();
  const em7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const grupos = useMemo(() => {
    const atrasadas = movs.filter((m) => m.data_vencimento && m.data_vencimento < hoje);
    const proximas = movs.filter((m) => m.data_vencimento && m.data_vencimento >= hoje && m.data_vencimento <= em7);
    const futuras = movs.filter((m) => !m.data_vencimento || m.data_vencimento > em7);
    return { atrasadas, proximas, futuras };
  }, [movs, hoje, em7]);

  const marcarPago = async (m: MovimentacaoFinanceira) => {
    try {
      await updateMutation.mutateAsync({ id: m.id, status: "pago", data_pagamento: todayISO() });
      toast({ title: "Marcado como pago" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const Grupo = ({ titulo, icon: Icon, color, items }: any) => (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${color}`} />
          {titulo} <Badge variant="outline">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento</p>
        ) : (
          items.map((m: MovimentacaoFinanceira) => (
            <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{m.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  Vence {fmtDate(m.data_vencimento)} · {m.categoria?.nome ?? "Sem categoria"} · {m.conta?.apelido}
                  {m.cliente && <> · <span className="font-medium">{m.cliente.razao_social}</span></>}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${m.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                  {m.tipo === "entrada" ? "+" : "-"} {fmtBRL(m.valor)}
                </p>
                {isAdmin && (
                  <Button size="sm" variant="outline" className="mt-1 h-7 gap-1" onClick={() => marcarPago(m)}>
                    <CheckCircle2 className="h-3 w-3" /> Pagar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Contas a Pagar / Receber</h1>
        <p className="text-sm text-muted-foreground">Lançamentos pendentes agrupados por urgência</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Grupo titulo="Atrasadas" icon={AlertTriangle} color="text-destructive" items={grupos.atrasadas} />
          <Grupo titulo="Próximos 7 dias" icon={Clock} color="text-warning" items={grupos.proximas} />
          <Grupo titulo="Futuras" icon={Calendar} color="text-info" items={grupos.futuras} />
        </div>
      )}
    </div>
  );
}
