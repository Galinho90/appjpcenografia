import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Receipt, Upload, Eye, AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useFechamentos, useMinhasNotasFiscais, useUploadNotaFiscal, getNotaFiscalSignedUrl,
  type NotaFiscal,
} from "@/hooks/useSupabaseData";

const statusConfig = {
  pendente: { label: "Pendente", variant: "outline" as const, icon: Clock },
  aprovada: { label: "Aprovada", variant: "default" as const, icon: CheckCircle2 },
  rejeitada: { label: "Rejeitada", variant: "destructive" as const, icon: AlertCircle },
};

const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtData = (iso: string) => new Date(iso + "T00:00").toLocaleDateString("pt-BR");

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_MB = 10;

export default function MinhasNotasFiscais() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: meu } = useQuery({
    queryKey: ["meu-colaborador-nf", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores").select("id, nome").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const colaboradorId = meu?.id;
  const { data: fechamentos = [], isLoading: loadingFech } = useFechamentos();
  const { data: notas = [], isLoading: loadingNotas } = useMinhasNotasFiscais(colaboradorId);
  const upload = useUploadNotaFiscal();

  const meusFechamentos = useMemo(
    () => fechamentos.filter((f: any) => f.colaborador_id === colaboradorId)
      .sort((a: any, b: any) => b.periodo_inicio.localeCompare(a.periodo_inicio)),
    [fechamentos, colaboradorId],
  );

  const notaPorFechamento = useMemo(() => {
    const map = new Map<string, NotaFiscal>();
    for (const n of notas) map.set(n.fechamento_id, n);
    return map;
  }, [notas]);

  const [openDialog, setOpenDialog] = useState<null | { fechamento: any; nota?: NotaFiscal }>(null);
  const [file, setFile] = useState<File | null>(null);
  const [numero, setNumero] = useState("");
  const [valor, setValor] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [viewNota, setViewNota] = useState<{ nota: NotaFiscal; fechamento: any; url: string } | null>(null);
  const [loadingView, setLoadingView] = useState(false);

  const openEnvio = (fechamento: any, nota?: NotaFiscal) => {
    setFile(null);
    setNumero(nota?.numero ?? "");
    setValor(nota ? String(nota.valor) : String(fechamento.valor_final ?? ""));
    setDataEmissao(nota?.data_emissao ?? "");
    setOpenDialog({ fechamento, nota });
  };

  const enviar = async () => {
    if (!openDialog || !user || !colaboradorId) return;
    if (!file) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({ title: `Arquivo maior que ${MAX_MB}MB`, variant: "destructive" });
      return;
    }
    try {
      await upload.mutateAsync({
        file,
        fechamento_id: openDialog.fechamento.id,
        colaborador_id: colaboradorId,
        periodo_inicio: openDialog.fechamento.periodo_inicio,
        periodo_fim: openDialog.fechamento.periodo_fim,
        numero: numero || undefined,
        valor: Number(valor) || 0,
        data_emissao: dataEmissao || undefined,
        user_id: user.id,
        existingId: openDialog.nota?.id,
      });
      toast({ title: "Nota enviada com sucesso!" });
      setOpenDialog(null);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    }
  };

  const visualizar = async (nota: NotaFiscal, fechamento: any) => {
    try {
      setLoadingView(true);
      setViewNota({ nota, fechamento, url: "" });
      const url = await getNotaFiscalSignedUrl(nota.arquivo_url);
      setViewNota({ nota, fechamento, url });
    } catch (e: any) {
      toast({ title: "Erro ao abrir", description: e.message, variant: "destructive" });
      setViewNota(null);
    } finally {
      setLoadingView(false);
    }
  };

  if (!colaboradorId && !loadingFech) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Minhas Notas Fiscais</h1>
        <p className="text-muted-foreground">Seu usuário não está vinculado a um cadastro de diarista.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Receipt className="h-7 w-7" /> Minhas Notas Fiscais
        </h1>
        <p className="text-muted-foreground">Envie a NF de cada quinzena fechada.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Quinzenas fechadas</CardTitle></CardHeader>
        <CardContent>
          {loadingFech || loadingNotas ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : meusFechamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma quinzena fechada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status NF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meusFechamentos.map((f: any) => {
                  const nota = notaPorFechamento.get(f.id);
                  const cfg = nota ? statusConfig[nota.status] : null;
                  const Icon = cfg?.icon ?? FileText;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {fmtData(f.periodo_inicio)} – {fmtData(f.periodo_fim)}
                      </TableCell>
                      <TableCell>{fmtBRL(Number(f.valor_final))}</TableCell>
                      <TableCell>
                        {nota && cfg ? (
                          <Badge variant={cfg.variant} className="gap-1">
                            <Icon className="h-3 w-3" />{cfg.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3" />Não enviada
                          </Badge>
                        )}
                        {nota?.status === "rejeitada" && (nota.observacoes || nota.rejeitada_em) && (
                          <div className="text-xs text-destructive mt-1 max-w-[280px] space-y-0.5">
                            {nota.rejeitada_em && (
                              <div><span className="font-medium">Rejeitada em:</span> {new Date(nota.rejeitada_em).toLocaleString("pt-BR")}</div>
                            )}
                            {nota.observacoes && (
                              <div><span className="font-medium">Motivo:</span> {nota.observacoes}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {nota && (
                          <Button size="sm" variant="ghost" onClick={() => visualizar(nota, f)}>
                            <Eye className="h-4 w-4 mr-1" />Ver
                          </Button>
                        )}
                        {(!nota || nota.status === "rejeitada") && (
                          <Button
                            size="sm"
                            variant={nota?.status === "rejeitada" ? "destructive" : "default"}
                            onClick={() => openEnvio(f, nota)}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            {nota ? "Reenviar NF" : "Enviar NF"}
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

      <Dialog open={!!openDialog} onOpenChange={(o) => !o && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Nota Fiscal</DialogTitle>
            <DialogDescription>
              Período {openDialog && `${fmtData(openDialog.fechamento.periodo_inicio)} – ${fmtData(openDialog.fechamento.periodo_fim)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="arq">Arquivo (PDF, JPG ou PNG, até {MAX_MB}MB)</Label>
              <Input id="arq" type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="num">Número da NF</Label>
                <Input id="num" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="val">Valor (R$)</Label>
                <Input id="val" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="dem">Data de emissão</Label>
              <Input id="dem" type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>Cancelar</Button>
            <Button onClick={enviar} disabled={upload.isPending}>
              {upload.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
