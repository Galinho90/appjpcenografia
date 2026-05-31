import { useMemo, useState } from "react";
import { Calculator, DollarSign, Clock, CheckCircle2, ChevronLeft, ChevronRight, Trash2, RotateCcw, Send, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getStatusBadge } from "@/lib/statusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useFechamentos, useGerarFechamentos, useUpdateFechamentoStatus, useDeleteFechamento,
} from "@/hooks/useSupabaseData";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Configuração de status agora vem de @/lib/statusBadge (padrão visual unificado).

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

export default function Fechamentos() {
  const { toast } = useToast();
  const { canEdit, isAdmin } = usePermissions();
  const { data: fechamentos = [], isLoading } = useFechamentos();
  const gerar = useGerarFechamentos();
  const updateStatus = useUpdateFechamentoStatus();
  const deleteFech = useDeleteFechamento();

  const [refDate, setRefDate] = useState<Date>(new Date());
  const [sortValor, setSortValor] = useState<"default" | "menor" | "maior">("default");
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
    () =>
      fechamentos
        .filter((f: any) => f.periodo_inicio === inicioISO && f.periodo_fim === fimISO)
        .filter((f: any) => !(f.status === "pendente" && Math.abs(Number(f.valor_final) || 0) < 0.005))
        .slice()
        .sort((a: any, b: any) => {
          if (sortValor !== "default") {
            const diff = Number(a.valor_final || 0) - Number(b.valor_final || 0);
            return sortValor === "menor" ? diff : -diff;
          }
          // Pendentes primeiro, pagos depois
          const statusOrder = (s: string) => (s === "pago" ? 1 : 0);
          const diff = statusOrder(a.status) - statusOrder(b.status);
          if (diff !== 0) return diff;
          return ((a.colaborador as any)?.nome ?? "").localeCompare(
            (b.colaborador as any)?.nome ?? "",
            "pt-BR",
            { sensitivity: "base" },
          );
        }),
    [fechamentos, inicioISO, fimISO, sortValor],
  );

  const totalPendente = fechamentosQ.filter(f => f.status === 'pendente').reduce((s, f) => s + f.valor_final, 0);
  const totalPago = fechamentosQ.filter(f => f.status === 'pago').reduce((s, f) => s + f.valor_final, 0);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pixTarget, setPixTarget] = useState<any | null>(null);
  const [pixSending, setPixSending] = useState(false);
  const qc = useQueryClient();

  const { data: integAtiva } = useQuery({
    queryKey: ["integracao_ativa"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("integracoes_bancarias")
        .select("banco, apelido")
        .eq("ativo", true)
        .maybeSingle();
      return data as { banco: string; apelido: string } | null;
    },
  });

  const handleEnviarPix = async () => {
    if (!pixTarget) return;
    setPixSending(true);
    try {
      const colab = pixTarget.colaborador as any;
      const { data, error } = await supabase.functions.invoke("pix-pagamento", {
        body: {
          fechamento_id: pixTarget.id,
          valor: Number(pixTarget.valor_final),
          chave_pix: colab?.chave_pix,
          favorecido: { nome: colab?.nome, documento: colab?.cpf },
          descricao: `Fechamento ${pixTarget.periodo_inicio} a ${pixTarget.periodo_fim}`,
        },
      });
      if (error) throw error;
      const mock = (data as any)?.mock;
      toast({
        title: mock ? "PIX simulado (modo dev)" : "PIX enviado!",
        description: mock
          ? "Sem credenciais reais; transação registrada apenas no log."
          : `Transação ${(data as any)?.transacao_id ?? ""}`,
      });
      qc.invalidateQueries({ queryKey: ["fechamentos"] });
      setPixTarget(null);
    } catch (e: any) {
      toast({ title: "Erro ao enviar PIX", description: e.message, variant: "destructive" });
    } finally {
      setPixSending(false);
    }
  };

  const handleGerar = async () => {
    try {
      const res = await gerar.mutateAsync({ periodo_inicio: inicioISO, periodo_fim: fimISO });
      toast({
        title: "Fechamento gerado!",
        description: `${res.criados} criado(s), ${res.atualizados} atualizado(s).`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao gerar", description: e.message, variant: "destructive" });
    }
  };

  const handleMarcarPago = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: "pago" });
      toast({ title: "Marcado como pago!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleReabrir = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: "pendente" });
      toast({ title: "Fechamento reaberto" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteFech.mutateAsync(confirmDelete);
      toast({ title: "Fechamento excluído" });
      setConfirmDelete(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

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

      {canEdit && (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={handleGerar} disabled={gerar.isPending}>
            <Calculator className="h-4 w-4" />
            {gerar.isPending ? "Gerando..." : "Gerar Fechamento"}
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-accent to-accent/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-accent-foreground/80">Total Pendente</p>
                <p className="text-2xl font-bold text-accent-foreground">{fmtBRL(totalPendente)}</p>
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
                <p className="text-2xl font-bold text-secondary-foreground">{fmtBRL(totalPago)}</p>
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
            <div className="py-10 text-center space-y-3">
              <p className="text-muted-foreground">Nenhum fechamento nesta quinzena.</p>
              <p className="text-xs text-muted-foreground">
                Clique em "Gerar Fechamento" para calcular automaticamente a partir dos lançamentos.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {fechamentosQ.map((f) => {
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
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Diárias: <span className="text-foreground font-medium">{fmtBRL(f.total_diarias)}</span></div>
                        <div>Vales: <span className="text-destructive font-medium">- {fmtBRL(f.total_vales)}</span></div>
                        <div>Reemb.: <span className="text-success font-medium">+ {fmtBRL(f.total_reembolsos)}</span></div>
                        <div>Final: <span className="text-foreground font-bold">{fmtBRL(f.valor_final)}</span></div>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {isAdmin && f.status === "pendente" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1 h-8 text-xs"
                            onClick={() => setPixTarget(f)}
                            disabled={!(f.colaborador as any)?.chave_pix || !integAtiva}
                            title={
                              !integAtiva
                                ? "Nenhuma integração bancária ativa"
                                : !(f.colaborador as any)?.chave_pix
                                ? "Colaborador sem chave PIX"
                                : `Pagar via ${integAtiva.banco.toUpperCase()}`
                            }
                          >
                            <Send className="h-3 w-3" /> Pagar PIX
                          </Button>
                        )}
                        {isAdmin && f.status === "pendente" && (
                          <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => handleMarcarPago(f.id)} disabled={updateStatus.isPending}>
                            <DollarSign className="h-3 w-3" /> Pagar
                          </Button>
                        )}
                        {canEdit && f.status === "pago" && (
                          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => handleReabrir(f.id)} disabled={updateStatus.isPending}>
                            <RotateCcw className="h-3 w-3" /> Reabrir
                          </Button>
                        )}
                        {canEdit && (
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setConfirmDelete(f.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
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
                      const cfg = getStatusBadge(f.status);
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{(f.colaborador as any)?.nome ?? "—"}</TableCell>
                          <TableCell>{fmtBRL(f.total_diarias)}</TableCell>
                          <TableCell className="text-destructive">- {fmtBRL(f.total_vales)}</TableCell>
                          <TableCell className="text-success">+ {fmtBRL(f.total_reembolsos)}</TableCell>
                          <TableCell className="font-bold">{fmtBRL(f.valor_final)}</TableCell>
                          <TableCell>
                            <Badge className={`gap-1 ${cfg.className}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isAdmin && f.status === "pendente" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1"
                                  onClick={() => setPixTarget(f)}
                                  disabled={!(f.colaborador as any)?.chave_pix || !integAtiva}
                                  title={
                                    !integAtiva
                                      ? "Nenhuma integração bancária ativa"
                                      : !(f.colaborador as any)?.chave_pix
                                      ? "Colaborador sem chave PIX"
                                      : `Pagar via ${integAtiva.banco.toUpperCase()}`
                                  }
                                >
                                  <Send className="h-3 w-3" /> Pagar PIX
                                </Button>
                              )}
                              {isAdmin && f.status === "pendente" && (
                                <Button size="sm" className="gap-1" onClick={() => handleMarcarPago(f.id)} disabled={updateStatus.isPending}>
                                  <DollarSign className="h-3 w-3" /> Marcar Pago
                                </Button>
                              )}
                              {canEdit && f.status === "pago" && (
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleReabrir(f.id)} disabled={updateStatus.isPending}>
                                  <RotateCcw className="h-3 w-3" /> Reabrir
                                </Button>
                              )}
                              {canEdit && (
                                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(f.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fechamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fechamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pixTarget} onOpenChange={(o) => !o && !pixSending && setPixTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento PIX?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div>
                  Banco ativo:{" "}
                  <strong className="uppercase">{integAtiva?.banco ?? "—"}</strong>{" "}
                  {integAtiva?.apelido ? `(${integAtiva.apelido})` : ""}
                </div>
                <div>Colaborador: <strong>{(pixTarget?.colaborador as any)?.nome}</strong></div>
                <div>Chave PIX: <strong>{(pixTarget?.colaborador as any)?.chave_pix}</strong></div>
                <div>Valor: <strong>{pixTarget ? fmtBRL(Number(pixTarget.valor_final)) : ""}</strong></div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pixSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleEnviarPix(); }} disabled={pixSending}>
              {pixSending ? "Enviando..." : "Confirmar e enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
