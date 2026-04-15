import { Calculator, DollarSign, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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

export default function Fechamentos() {
  const { data: fechamentos = [], isLoading } = useFechamentos();

  const totalPendente = fechamentos.filter(f => f.status === 'pendente').reduce((s, f) => s + f.valor_final, 0);
  const totalPago = fechamentos.filter(f => f.status === 'pago').reduce((s, f) => s + f.valor_final, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fechamentos</h1>
          <p className="text-muted-foreground">Fechamento quinzenal de pagamentos</p>
        </div>
        <Button className="gap-2"><Calculator className="h-4 w-4" /> Gerar Fechamento</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-accent-foreground/80">Total Pendente</p>
                <p className="text-2xl font-bold text-accent-foreground">R$ {totalPendente.toLocaleString("pt-BR")}</p>
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
                <p className="text-2xl font-bold text-secondary-foreground">R$ {totalPago.toLocaleString("pt-BR")}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-secondary-foreground/30" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Fechamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
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
                {fechamentos.map((f) => {
                  const cfg = statusConfig[f.status] ?? statusConfig.pendente;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{(f.colaborador as any)?.nome ?? "—"}</TableCell>
                      <TableCell>R$ {f.total_diarias.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-destructive">- R$ {f.total_vales.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-success">+ R$ {f.total_reembolsos.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="font-bold">R$ {f.valor_final.toLocaleString("pt-BR")}</TableCell>
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
