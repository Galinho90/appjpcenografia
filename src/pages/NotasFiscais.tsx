import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Receipt, ChevronLeft, ChevronRight, Eye, Check, X, Trash2, AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useNotasFiscais, useUpdateStatusNotaFiscal, useDeleteNotaFiscal,
  getNotaFiscalSignedUrl, useFechamentos, useColaboradores,
} from "@/hooks/useSupabaseData";

const statusConfig = {
  pendente: { label: "Pendente", variant: "outline" as const, icon: Clock },
  aprovada: { label: "Aprovada", variant: "default" as const, icon: CheckCircle2 },
  rejeitada: { label: "Rejeitada", variant: "destructive" as const, icon: AlertCircle },
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
const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function NotasFiscais() {
  const { toast } = useToast();
  const [refDate, setRefDate] = useState<Date>(new Date());
  const selecionada = useMemo(() => getQuinzena(refDate), [refDate]);
  const inicioISO = toISO(selecionada.inicio);
  const fimISO = toISO(selecionada.fim);

  const { data: notas = [], isLoading, isFetching, refetch } = useNotasFiscais({ inicio: inicioISO, fim: fimISO });
  const qc = useQueryClient();
  const atualizar = async () => {
    await qc.invalidateQueries({ queryKey: ["notas_fiscais"] });
    await qc.invalidateQueries({ queryKey: ["fechamentos"] });
    await refetch();
    toast({ title: "Lista atualizada" });
  };
  const { data: fechamentos = [] } = useFechamentos();
  const { data: colaboradores = [] } = useColaboradores();
  const updateStatus = useUpdateStatusNotaFiscal();
  const deleteNota = useDeleteNotaFiscal();

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; arquivo_url: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; nome: string } | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  const fechamentosQ = useMemo(
    () => fechamentos.filter((f: any) => f.periodo_inicio === inicioISO && f.periodo_fim === fimISO),
    [fechamentos, inicioISO, fimISO],
  );

  const pendentesEnvio = useMemo(() => {
    const enviadosIds = new Set(notas.map(n => n.colaborador_id));
    return fechamentosQ.filter((f: any) => !enviadosIds.has(f.colaborador_id));
  }, [fechamentosQ, notas]);

  const colNome = (id: string) => colaboradores.find((c: any) => c.id === id)?.nome ?? "—";

  const visualizar = async (path: string) => {
    try {
      const url = await getNotaFiscalSignedUrl(path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Erro ao abrir arquivo", description: e.message, variant: "destructive" });
    }
  };

  const aprovar = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: "aprovada" });
      toast({ title: "Nota aprovada" });
      // Notifica colaborador por e-mail (best-effort)
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.functions.invoke("notify-nota-fiscal", {
          body: { nota_id: id, evento: "aprovada" },
        });
        if (error) throw error;
        if (data?.ok) {
          toast({ title: "E-mail enviado ao colaborador" });
        } else if (data?.skipped) {
          toast({ title: "E-mail não enviado", description: data.reason, variant: "destructive" });
        } else if (data?.error) {
          toast({ title: "Falha ao enviar e-mail", description: data.error, variant: "destructive" });
        }
      } catch (mailErr: any) {
        toast({ title: "Falha ao enviar e-mail", description: mailErr.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };
  const abrirRejeitar = (id: string, nome: string) => {
    setMotivoRejeicao("");
    setRejectTarget({ id, nome });
  };

  const confirmarRejeicao = async () => {
    if (!rejectTarget) return;
    const motivo = motivoRejeicao.trim();
    if (motivo.length < 3) {
      toast({ title: "Informe o motivo", description: "O motivo deve ter pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }
    if (motivo.length > 500) {
      toast({ title: "Motivo muito longo", description: "Máximo de 500 caracteres.", variant: "destructive" });
      return;
    }
    try {
      await updateStatus.mutateAsync({ id: rejectTarget.id, status: "rejeitada", observacoes: motivo });
      toast({ title: "Nota rejeitada" });
      setRejectTarget(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteNota.mutateAsync(confirmDelete);
      toast({ title: "Nota excluída" });
      setConfirmDelete(null);
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const shift = (dir: -1 | 1) => {
    const next = shiftQuinzena(selecionada, dir);
    setRefDate(next.inicio);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-7 w-7" /> Notas Fiscais
          </h1>
          <p className="text-muted-foreground">Recebimento de NF dos diaristas por quinzena.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={atualizar} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar notas
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium px-3">
            {fmt(selecionada.inicio)} – {fmt(selecionada.fim)}
          </span>
          <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recebidas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{notas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Aprovadas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{notas.filter(n => n.status === "aprovada").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pendentes de envio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendentesEnvio.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Notas recebidas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : notas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma nota fiscal recebida nesta quinzena.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Diarista</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map(n => {
                  const cfg = statusConfig[n.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.colaborador?.nome ?? colNome(n.colaborador_id)}</TableCell>
                      <TableCell>{n.numero ?? "—"}</TableCell>
                      <TableCell>{n.data_emissao ? new Date(n.data_emissao + "T00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>{fmtBRL(Number(n.valor))}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="gap-1">
                          <Icon className="h-3 w-3" />{cfg.label}
                        </Badge>
                        {n.status === "rejeitada" && (n.observacoes || n.rejeitada_em) && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-[260px] space-y-0.5">
                            {n.rejeitada_em && (
                              <div><span className="font-medium">Rejeitada em:</span> {new Date(n.rejeitada_em).toLocaleString("pt-BR")}</div>
                            )}
                            {n.observacoes && (
                              <div><span className="font-medium">Motivo:</span> {n.observacoes}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => visualizar(n.arquivo_url)} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {n.status !== "aprovada" && (
                          <Button size="icon" variant="ghost" onClick={() => aprovar(n.id)} title="Aprovar">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {n.status !== "rejeitada" && (
                          <Button size="icon" variant="ghost" onClick={() => abrirRejeitar(n.id, n.colaborador?.nome ?? colNome(n.colaborador_id))} title="Rejeitar">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ id: n.id, arquivo_url: n.arquivo_url })} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pendentesEnvio.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Diaristas que ainda não enviaram NF</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {pendentesEnvio.map((f: any) => (
                <li key={f.id} className="flex justify-between">
                  <span>{colNome(f.colaborador_id)}</span>
                  <span className="text-muted-foreground">{fmtBRL(Number(f.valor_final))}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota fiscal?</AlertDialogTitle>
            <AlertDialogDescription>O arquivo também será removido. Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar nota fiscal</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição{rejectTarget ? ` para ${rejectTarget.nome}` : ""}. O diarista poderá ver essa mensagem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value.slice(0, 500))}
              placeholder="Ex.: número da NF não confere com o valor do fechamento."
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">{motivoRejeicao.length}/500</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarRejeicao} disabled={updateStatus.isPending}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
