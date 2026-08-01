import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Receipt, ChevronLeft, ChevronRight, Eye, Check, X, Trash2, RefreshCw } from "lucide-react";
import { getStatusBadge } from "@/lib/statusBadge";
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
import { PageHeader } from "@/components/PageHeader";

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
  const [viewer, setViewer] = useState<{ nota: any; url: string } | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  const fechamentosQ = useMemo(
    () => fechamentos.filter((f: any) => f.periodo_inicio === inicioISO && f.periodo_fim === fimISO),
    [fechamentos, inicioISO, fimISO],
  );

  const pendentesEnvio = useMemo(() => {
    const enviadosIds = new Set(notas.map(n => n.colaborador_id));
    return fechamentosQ
      .filter((f: any) => !enviadosIds.has(f.colaborador_id))
      .slice()
      .sort((a: any, b: any) => {
        const na = colaboradores.find((c: any) => c.id === a.colaborador_id)?.nome ?? "";
        const nb = colaboradores.find((c: any) => c.id === b.colaborador_id)?.nome ?? "";
        return na.localeCompare(nb, "pt-BR", { sensitivity: "base" });
      });
  }, [fechamentosQ, notas, colaboradores]);

  const colNome = (id: string) => colaboradores.find((c: any) => c.id === id)?.nome ?? "—";

  const visualizar = async (nota: any) => {
    try {
      setViewerLoading(true);
      const url = await getNotaFiscalSignedUrl(nota.arquivo_url);
      setViewer({ nota, url });
    } catch (e: any) {
      toast({ title: "Erro ao abrir arquivo", description: e.message, variant: "destructive" });
    } finally {
      setViewerLoading(false);
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
      const notaId = rejectTarget.id;
      setRejectTarget(null);
      // Notifica colaborador por e-mail (best-effort)
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.functions.invoke("notify-nota-fiscal", {
          body: { nota_id: notaId, evento: "rejeitada", motivo },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 sm:h-7 sm:w-7" /> Notas Fiscais
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Recebimento de NF dos diaristas por quinzena.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={atualizar} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar notas</span>
            <span className="sm:hidden">Atualizar</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium px-2 sm:px-3 whitespace-nowrap">
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
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {[...notas].sort((a: any, b: any) => {
                  const na = a.colaborador?.nome ?? colNome(a.colaborador_id);
                  const nb = b.colaborador?.nome ?? colNome(b.colaborador_id);
                  return na.localeCompare(nb, "pt-BR", { sensitivity: "base" });
                }).map(n => {
                  const cfg = getStatusBadge(n.status);
                  const Icon = cfg.icon;
                  return (
                    <div key={n.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{n.colaborador?.nome ?? colNome(n.colaborador_id)}</span>
                        <Badge className={`gap-1 text-xs ${cfg.className}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Número</div>
                          <div>{n.numero ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Emissão</div>
                          <div>{n.data_emissao ? new Date(n.data_emissao + "T00:00").toLocaleDateString("pt-BR") : "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Valor</div>
                          <div className="font-medium">{fmtBRL(Number(n.valor))}</div>
                        </div>
                      </div>
                      {n.status === "rejeitada" && (n.observacoes || n.rejeitada_em) && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {n.rejeitada_em && (
                            <div><span className="font-medium">Rejeitada em:</span> {new Date(n.rejeitada_em).toLocaleString("pt-BR")}</div>
                          )}
                          {n.observacoes && (
                            <div><span className="font-medium">Motivo:</span> {n.observacoes}</div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => visualizar(n)} title="Visualizar" disabled={viewerLoading}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {n.status !== "aprovada" && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => aprovar(n.id)} title="Aprovar">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {n.status !== "rejeitada" && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => abrirRejeitar(n.id, n.colaborador?.nome ?? colNome(n.colaborador_id))} title="Rejeitar">
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setConfirmDelete({ id: n.id, arquivo_url: n.arquivo_url })} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                      <TableHead>Diarista</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...notas].sort((a: any, b: any) => {
                      const na = a.colaborador?.nome ?? colNome(a.colaborador_id);
                      const nb = b.colaborador?.nome ?? colNome(b.colaborador_id);
                      return na.localeCompare(nb, "pt-BR", { sensitivity: "base" });
                    }).map(n => {
                      const cfg = getStatusBadge(n.status);
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium">{n.colaborador?.nome ?? colNome(n.colaborador_id)}</TableCell>
                          <TableCell>{n.numero ?? "—"}</TableCell>
                          <TableCell>{n.data_emissao ? new Date(n.data_emissao + "T00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                          <TableCell>{fmtBRL(Number(n.valor))}</TableCell>
                          <TableCell>
                            <Badge className={`gap-1 ${cfg.className}`}>
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
                            <Button size="icon" variant="ghost" onClick={() => visualizar(n)} title="Visualizar" disabled={viewerLoading}>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {pendentesEnvio.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Diaristas que ainda não enviaram NF</CardTitle></CardHeader>
          <CardContent>
            {/* Valor da NF = total de créditos (diárias) — não inclui reembolso, não desconta vale */}
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {pendentesEnvio.map((f: any) => {
                const valorNF = Number(f.total_diarias ?? 0);
                return (
                  <div key={f.id} className="py-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{colNome(f.colaborador_id)}</span>
                    <span className="text-sm text-muted-foreground">{fmtBRL(valorNF)}</span>
                  </div>
                );
              })}
            </div>
            {/* Desktop list */}
            <ul className="hidden md:block text-sm space-y-1">
              {pendentesEnvio.map((f: any) => {
                const valorNF = Number(f.total_diarias ?? 0);
                return (
                  <li key={f.id} className="flex justify-between">
                    <span>{colNome(f.colaborador_id)}</span>
                    <span className="text-muted-foreground">{fmtBRL(valorNF)}</span>
                  </li>
                );
              })}
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

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-3 border-b">
            <DialogTitle>Detalhes da Nota Fiscal</DialogTitle>
            <DialogDescription>
              {viewer ? (viewer.nota.colaborador?.nome ?? colNome(viewer.nota.colaborador_id)) : ""}
            </DialogDescription>
          </DialogHeader>
          {viewer && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b bg-muted/30 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Número</div>
                  <div className="font-medium">{viewer.nota.numero ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Emissão</div>
                  <div className="font-medium">
                    {viewer.nota.data_emissao ? new Date(viewer.nota.data_emissao + "T00:00").toLocaleDateString("pt-BR") : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Valor</div>
                  <div className="font-medium">{fmtBRL(Number(viewer.nota.valor))}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium">{getStatusBadge(viewer.nota.status).label}</div>
                </div>
                {viewer.nota.observacoes && (
                  <div className="col-span-2 md:col-span-4">
                    <div className="text-xs text-muted-foreground">Observações</div>
                    <div className="font-medium text-sm">{viewer.nota.observacoes}</div>
                  </div>
                )}
              </div>
              <div className="flex-1 bg-muted">
                <iframe
                  src={viewer.url}
                  title="Nota Fiscal"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}
          <DialogFooter className="p-4 border-t">
            {viewer && (
              <Button variant="outline" asChild>
                <a href={viewer.url} target="_blank" rel="noopener noreferrer">Abrir em nova aba</a>
              </Button>
            )}
            <Button onClick={() => setViewer(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
