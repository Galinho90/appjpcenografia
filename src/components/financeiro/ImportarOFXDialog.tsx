import { useState, useMemo, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useContasBancarias, useCategoriasFinanceiras } from "@/hooks/useFinanceiro";
import { parseOFX, type OFXTransaction } from "@/lib/ofx";
import { fmtBRL, fmtDate, todayISO } from "@/lib/financeiro";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

type MovCandidate = {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  fitid: string | null;
};

type Row = {
  tx: OFXTransaction;
  action: "criar" | "vincular" | "ignorar";
  movId?: string;
  candidates: MovCandidate[];
  alreadyImported: boolean;
};

function daysDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.abs(Math.round((da - db) / 86400000));
}

export default function ImportarOFXDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: contas = [] } = useContasBancarias();
  const fileRef = useRef<HTMLInputElement>(null);

  const [contaId, setContaId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setRows([]);
    setContaId("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (file: File) => {
    if (!contaId) {
      toast({ title: "Selecione a conta antes de carregar o arquivo", variant: "destructive" });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setLoading(true);
    try {
      const text = await file.text();
      const { transactions } = parseOFX(text);
      if (transactions.length === 0) {
        toast({ title: "Nenhuma transação encontrada no arquivo", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Buscar movimentações da conta para match e fitids já importados
      const datas = transactions.map((t) => t.data).sort();
      const dataMin = new Date(new Date(datas[0] + "T00:00:00").getTime() - 5 * 86400000)
        .toISOString().slice(0, 10);
      const dataMax = new Date(new Date(datas[datas.length - 1] + "T00:00:00").getTime() + 5 * 86400000)
        .toISOString().slice(0, 10);

      const { data: movs, error } = await supabase
        .from("movimentacoes_financeiras" as any)
        .select("id, descricao, valor, tipo, data_vencimento, data_pagamento, status, fitid, conta_id")
        .eq("conta_id", contaId)
        .gte("data_vencimento", dataMin)
        .lte("data_vencimento", dataMax)
        .limit(1000);
      if (error) throw error;

      const fitidExistentes = new Set(
        ((movs ?? []) as any[]).filter((m) => m.fitid).map((m) => m.fitid as string)
      );

      const newRows: Row[] = transactions.map((tx) => {
        const alreadyImported = fitidExistentes.has(tx.fitid);
        const candidates: MovCandidate[] = ((movs ?? []) as any[])
          .filter((m: any) =>
            !m.fitid &&
            m.tipo === tx.tipo &&
            Number(m.valor) === tx.valor &&
            m.data_vencimento &&
            daysDiff(m.data_vencimento, tx.data) <= 3
          )
          .map((m: any) => ({
            id: m.id,
            descricao: m.descricao,
            valor: Number(m.valor),
            data_vencimento: m.data_vencimento,
            data_pagamento: m.data_pagamento,
            status: m.status,
            fitid: m.fitid,
          }));

        let action: Row["action"] = "criar";
        let movId: string | undefined;
        if (alreadyImported) {
          action = "ignorar";
        } else if (candidates.length === 1) {
          action = "vincular";
          movId = candidates[0].id;
        } else if (candidates.length > 1) {
          action = "vincular";
          movId = candidates[0].id;
        }
        return { tx, action, movId, candidates, alreadyImported };
      });

      setRows(newRows);
    } catch (e: any) {
      toast({ title: "Erro ao ler arquivo OFX", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    let criar = 0, vincular = 0, ignorar = 0;
    for (const r of rows) {
      if (r.action === "criar") criar++;
      else if (r.action === "vincular") vincular++;
      else ignorar++;
    }
    return { criar, vincular, ignorar };
  }, [rows]);

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const handleConciliar = async () => {
    setSaving(true);
    let ok = 0, fail = 0;
    try {
      await Promise.all(
        rows.map(async (r) => {
          try {
            if (r.action === "ignorar") return;
            if (r.action === "vincular" && r.movId) {
              const { error } = await supabase
                .from("movimentacoes_financeiras" as any)
                .update({
                  status: "pago",
                  data_pagamento: r.tx.data,
                  fitid: r.tx.fitid,
                } as any)
                .eq("id", r.movId);
              if (error) throw error;
            } else if (r.action === "criar") {
              const { error } = await supabase
                .from("movimentacoes_financeiras" as any)
                .insert({
                  conta_id: contaId,
                  categoria_id: null,
                  tipo: r.tx.tipo,
                  valor: r.tx.valor,
                  data_vencimento: r.tx.data,
                  data_pagamento: r.tx.data,
                  status: "pago",
                  descricao: r.tx.descricao || `OFX ${r.tx.trntype}`,
                  origem: "ofx",
                  fitid: r.tx.fitid,
                } as any);
              if (error) throw error;
            }
            ok++;
          } catch {
            fail++;
          }
        })
      );
      qc.invalidateQueries({ queryKey: ["movimentacoes_financeiras"] });
      qc.invalidateQueries({ queryKey: ["saldo_conta"] });
      toast({
        title: "Conciliação concluída",
        description: `${ok} processadas${fail > 0 ? `, ${fail} com erro` : ""}.`,
        variant: fail > 0 ? "destructive" : "default",
      });
      handleClose(false);
    } catch (e: any) {
      toast({ title: "Erro na conciliação", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" /> Importar extrato OFX
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Conta bancária</Label>
            <Select value={contaId} onValueChange={(v) => { setContaId(v); setRows([]); }}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.apelido}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arquivo OFX</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".ofx,.OFX,text/plain"
              disabled={!contaId || loading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Processando arquivo...
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-success text-success-foreground">Vincular: {stats.vincular}</Badge>
              <Badge className="bg-info text-info-foreground">Criar: {stats.criar}</Badge>
              <Badge variant="outline">Ignorar: {stats.ignorar}</Badge>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[110px]">Valor</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[280px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.tx.fitid + i}>
                      <TableCell className="text-xs">{fmtDate(r.tx.data)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="break-words">{r.tx.descricao || "—"}</div>
                        {r.alreadyImported && (
                          <Badge variant="outline" className="text-[10px] mt-1">Já importado</Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-xs font-medium whitespace-nowrap ${r.tx.tipo === "entrada" ? "text-success" : "text-destructive"}`}>
                        {r.tx.tipo === "entrada" ? "+" : "-"} {fmtBRL(r.tx.valor)}
                      </TableCell>
                      <TableCell>
                        {r.alreadyImported ? (
                          <Badge variant="outline" className="text-[10px]">—</Badge>
                        ) : r.candidates.length === 0 ? (
                          <span title="Sem match"><AlertCircle className="h-4 w-4 text-destructive" /></span>
                        ) : r.candidates.length === 1 ? (
                          <span title="Match único"><CheckCircle2 className="h-4 w-4 text-success" /></span>
                        ) : (
                          <span title="Múltiplos matches"><HelpCircle className="h-4 w-4 text-warning" /></span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Select
                            value={r.action}
                            onValueChange={(v: any) => updateRow(i, {
                              action: v,
                              movId: v === "vincular" ? (r.movId ?? r.candidates[0]?.id) : undefined,
                            })}
                          >
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="criar">Criar nova</SelectItem>
                              <SelectItem value="vincular" disabled={r.candidates.length === 0}>
                                Vincular a existente
                              </SelectItem>
                              <SelectItem value="ignorar">Ignorar</SelectItem>
                            </SelectContent>
                          </Select>
                          {r.action === "vincular" && r.candidates.length > 0 && (
                            <Select
                              value={r.movId ?? r.candidates[0].id}
                              onValueChange={(v) => updateRow(i, { movId: v })}
                            >
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {r.candidates.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {fmtDate(c.data_vencimento ?? "")} — {c.descricao} ({fmtBRL(c.valor)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConciliar} disabled={rows.length === 0 || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Conciliar tudo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
