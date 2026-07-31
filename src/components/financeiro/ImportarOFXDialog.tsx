import { useState, useMemo, useRef } from "react";
import { Upload, CheckCircle2, AlertCircle, HelpCircle, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  categoriaId?: string;
  candidates: MovCandidate[];
  alreadyImported: boolean;
  /** Vínculos sugeridos automaticamente precisam ser confirmados pelo usuário antes de conciliar. */
  confirmado: boolean;
  /** Motivo da sugestão automática, exibido para facilitar a conferência. */
  sugestao?: "valor_data" | "nome";
};

type OFXMeta = {
  ledgerBal?: number;
  ledgerBalDate?: string;
  dtStart?: string;
  dtEnd?: string;
};

type SistemaExtra = {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  data: string;
};

export default function ImportarOFXDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: contas = [] } = useContasBancarias();
  const { data: categorias = [] } = useCategoriasFinanceiras();
  const fileRef = useRef<HTMLInputElement>(null);

  const [contaId, setContaId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ofxMeta, setOfxMeta] = useState<OFXMeta>({});
  const [saldoSistema, setSaldoSistema] = useState<number | null>(null);
  const [extrasSistema, setExtrasSistema] = useState<SistemaExtra[]>([]);

  const reset = () => {
    setRows([]);
    setContaId("");
    setOfxMeta({});
    setSaldoSistema(null);
    setExtrasSistema([]);
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
      const parsed = parseOFX(text);
      const { transactions, ledgerBal, ledgerBalDate, dtStart, dtEnd } = parsed;
      if (transactions.length === 0) {
        toast({ title: "Nenhuma transação encontrada no arquivo", variant: "destructive" });
        setLoading(false);
        return;
      }

      setOfxMeta({ ledgerBal, ledgerBalDate, dtStart, dtEnd });

      // Buscar movimentações da conta para match e fitids já importados
      const datas = transactions.map((t) => t.data).sort();
      const dataMin = new Date(new Date(datas[0] + "T00:00:00").getTime() - 60 * 86400000)
        .toISOString().slice(0, 10);
      const dataMax = new Date(new Date(datas[datas.length - 1] + "T00:00:00").getTime() + 60 * 86400000)
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

      // Tolerância de centavos/tarifa: diferenças de até R$ 1,00 ainda são
      // consideradas o mesmo pagamento (mesma data e mesmo tipo).
      const TOLERANCIA = 1;
      const TOLERANCIA_DIAS = 15; // Aumentado para 15 dias para captar pagamentos que demoram a processar ou são feitos antecipadamente

      const newRows: Row[] = transactions.map((tx) => {
        const alreadyImported = fitidExistentes.has(tx.fitid);
        
        const candidates: MovCandidate[] = ((movs ?? []) as any[])
          .filter((m: any) => {
            if (m.fitid) return false;
            if (m.tipo !== tx.tipo) return false;
            
            // Tolerância de centavos/tarifa: diferenças de até R$ 1,00 ainda são
            // consideradas o mesmo pagamento.
            const diffValor = Math.abs(Number(m.valor) - tx.valor);
            if (diffValor > TOLERANCIA) return false;
            
            // Vínculo permitido quando a data efetiva do lançamento está dentro da tolerância
            const dEfet = m.data_pagamento ?? m.data_vencimento;
            if (!dEfet) return false;
            
            const diffMs = Math.abs(new Date(dEfet + "T00:00:00").getTime() - new Date(tx.data + "T00:00:00").getTime());
            const diffDias = diffMs / (1000 * 60 * 60 * 24);
            return diffDias <= TOLERANCIA_DIAS;
          })
          .map((m: any) => ({
            id: m.id,
            descricao: m.descricao,
            valor: Number(m.valor),
            data_vencimento: m.data_vencimento,
            data_pagamento: m.data_pagamento,
            status: m.status,
            fitid: m.fitid,
          }))
          .sort((a, b) => {
            // Prioriza match exato de data, depois menor diferença de valor
            const dataMatchA = (a.data_pagamento ?? a.data_vencimento) === tx.data ? 0 : 1;
            const dataMatchB = (b.data_pagamento ?? b.data_vencimento) === tx.data ? 0 : 1;
            if (dataMatchA !== dataMatchB) return dataMatchA - dataMatchB;
            return Math.abs(a.valor - tx.valor) - Math.abs(b.valor - tx.valor);
          });

        let action: Row["action"] = "criar";
        let movId: string | undefined;
        let sugestao: Row["sugestao"];

        if (alreadyImported) {
          action = "ignorar";
        } else if (candidates.length >= 1) {
          // Sugestão automática por valor + data (precisa de confirmação)
          action = "vincular";
          movId = candidates[0].id;
          sugestao = "valor_data";
        } else {
          // TENTAR MATCH POR NOME SE NÃO HOUVER CANDIDATO POR VALOR/DATA
          const txDesc = (tx.descricao || "").toUpperCase();
          const candidateByName = ((movs ?? []) as any[]).find(m => {
            if (m.fitid) return false;
            if (m.tipo !== tx.tipo) return false;

            const mDesc = (m.descricao || "").toUpperCase();

            // Match flexível: removemos prefixos comuns de fechamento para comparar apenas os nomes
            const cleanMDesc = mDesc.replace("PAGAMENTO FECHAMENTO ", "").trim();
            const names = ["BRUNO CARDOSO", "THIAGO GON", "JOSE SANTOS", "PAULO VICTOR"];

            return names.some(n => cleanMDesc.includes(n) && txDesc.includes(n));
          });

          if (candidateByName) {
            action = "vincular";
            movId = candidateByName.id;
            sugestao = "nome";
          }
        }

        return {
          tx,
          action,
          movId,
          categoriaId: undefined,
          // Quando há match por nome, o candidato não está na lista filtrada por valor/data:
          // incluímos manualmente para permitir a conferência no select.
          candidates:
            sugestao === "nome" && movId && !candidates.some((c) => c.id === movId)
              ? [
                  ...(((movs ?? []) as any[])
                    .filter((m: any) => m.id === movId)
                    .map((m: any) => ({
                      id: m.id,
                      descricao: m.descricao,
                      valor: Number(m.valor),
                      data_vencimento: m.data_vencimento,
                      data_pagamento: m.data_pagamento,
                      status: m.status,
                      fitid: m.fitid,
                    })) as MovCandidate[]),
                  ...candidates,
                ]
              : candidates,
          alreadyImported,
          // Nada sugerido automaticamente entra confirmado: o usuário confere sempre.
          confirmado: action !== "vincular",
          sugestao,
        };
      });


      setRows(newRows);

      // Buscar saldo do sistema na data do LEDGERBAL (ou fim do período)
      const dataRef = ledgerBalDate || dtEnd || datas[datas.length - 1];
      if (dataRef) {
        const { data: saldoData } = await supabase.rpc("get_saldo_conta", {
          _conta_id: contaId,
          _data_ref: dataRef,
        });
        if (saldoData != null) setSaldoSistema(Number(saldoData));
      }

      // Identificar "extras" no sistema: movs pagas na conta dentro do período OFX
      // que NÃO estão no arquivo (nem por fitid, nem por candidato vinculado)
      const fitidsOFX = new Set(transactions.map((t) => t.fitid));
      const candidatoIds = new Set<string>();
      for (const r of newRows) {
        if (r.action === "vincular" && r.movId) candidatoIds.add(r.movId);
      }
      const inicio = dtStart || datas[0];
      const fim = dtEnd || datas[datas.length - 1];
      const extras: SistemaExtra[] = ((movs ?? []) as any[])
        .filter((m: any) => {
          if (m.status !== "pago") return false;
          const dEfet = m.data_pagamento ?? m.data_vencimento;
          if (!dEfet) return false;
          if (dEfet < inicio || dEfet > fim) return false;
          // Já reconciliado via fitid do OFX
          if (m.fitid && fitidsOFX.has(m.fitid)) return false;
          // Vai ser vinculado nesta importação
          if (candidatoIds.has(m.id)) return false;
          // Existe transação equivalente no OFX (mesma data, mesmo tipo,
          // diferença de até R$ 1,00) — não é um "extra" de verdade
          const temEquivalente = transactions.some(
            (t) =>
              t.tipo === m.tipo &&
              Math.abs(Number(m.valor) - t.valor) <= TOLERANCIA &&
              Math.abs(new Date(dEfet + "T00:00:00").getTime() - new Date(t.data + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24) <= TOLERANCIA_DIAS
          );
          if (temEquivalente) return false;
          return true;

        })
        .map((m: any) => ({
          id: m.id,
          descricao: m.descricao,
          valor: Number(m.valor),
          tipo: m.tipo,
          data: m.data_pagamento ?? m.data_vencimento,
        }));
      setExtrasSistema(extras);
    } catch (e: any) {
      toast({ title: "Erro ao ler arquivo OFX", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    let criar = 0, vincular = 0, ignorar = 0, pendentesConfirmacao = 0;
    for (const r of rows) {
      if (r.action === "criar") criar++;
      else if (r.action === "vincular") {
        vincular++;
        if (!r.confirmado) pendentesConfirmacao++;
      } else ignorar++;
    }
    return { criar, vincular, ignorar, pendentesConfirmacao };
  }, [rows]);

  const confirmarTodos = () => {
    setRows((prev) => prev.map((r) => (r.action === "vincular" ? { ...r, confirmado: true } : r)));
  };

  // Reconciliação de saldo: LEDGERBAL do OFX vs saldo esperado no sistema após conciliação
  const reconciliacao = useMemo(() => {
    if (ofxMeta.ledgerBal == null || saldoSistema == null) return null;

    // Delta líquido gerado apenas pelas ações desta importação:
    // - "criar": adiciona ao saldo do sistema (entrada +, saida -)
    // - "vincular": mov já existe e pode já estar em outro status/data; se não era 'pago',
    //   passar a 'pago' também afeta o saldo. Aqui simplificamos assumindo que candidatos
    //   típicos vêm de movs pendentes → então também impactam.
    let deltaAcoes = 0;
    for (const r of rows) {
      if (r.action === "criar") {
        deltaAcoes += r.tx.tipo === "entrada" ? r.tx.valor : -r.tx.valor;
      } else if (r.action === "vincular" && r.movId) {
        const cand = r.candidates.find((c) => c.id === r.movId);
        if (cand && cand.status !== "pago") {
          deltaAcoes += r.tx.tipo === "entrada" ? r.tx.valor : -r.tx.valor;
        } else if (cand) {
          // Já estava pago: só o ajuste de valor (tarifa/centavos) impacta o saldo
          const ajuste = r.tx.valor - cand.valor;
          deltaAcoes += r.tx.tipo === "entrada" ? ajuste : -ajuste;
        }
      }

    }

    const saldoEsperado = Number((saldoSistema + deltaAcoes).toFixed(2));
    const diff = Number((ofxMeta.ledgerBal - saldoEsperado).toFixed(2));
    return {
      ledgerBal: ofxMeta.ledgerBal,
      saldoEsperado,
      diff,
      ok: Math.abs(diff) < 0.01,
    };
  }, [ofxMeta, saldoSistema, rows]);

  // Somatório do impacto de possíveis causas (extras do sistema + linhas ignoradas)
  const causasDelta = useMemo(() => {
    let extrasImpacto = 0;
    for (const e of extrasSistema) {
      extrasImpacto += e.tipo === "entrada" ? e.valor : -e.valor;
    }
    let ignoradasImpacto = 0;
    for (const r of rows) {
      if (r.action === "ignorar" && !r.alreadyImported) {
        ignoradasImpacto += r.tx.tipo === "entrada" ? r.tx.valor : -r.tx.valor;
      }
    }
    return { extrasImpacto, ignoradasImpacto };
  }, [extrasSistema, rows]);

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const handleConciliar = async () => {
    // Guarda: nenhum vínculo é gravado sem confirmação explícita do usuário.
    const naoConfirmados = rows.filter((r) => r.action === "vincular" && !r.confirmado).length;
    if (naoConfirmados > 0) {
      toast({
        title: "Confirme os vínculos",
        description: `${naoConfirmados} vínculo(s) sugerido(s) ainda não foram confirmados.`,
        variant: "destructive",
      });
      return;
    }
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
                  valor: r.tx.valor,
                  data_vencimento: r.tx.data,
                  data_pagamento: r.tx.data,
                  fitid: r.tx.fitid,
                } as any)

                .eq("id", r.movId);
              if (error) throw error;
            } else if (r.action === "criar") {
              if (!r.categoriaId) {
                throw new Error("Categoria não selecionada");
              }
              const { error } = await supabase
                .from("movimentacoes_financeiras" as any)
                .insert({
                  conta_id: contaId,
                  categoria_id: r.categoriaId,
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
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="bg-success text-success-foreground">Vincular: {stats.vincular}</Badge>
              <Badge className="bg-info text-info-foreground">Criar: {stats.criar}</Badge>
              <Badge variant="outline">Ignorar: {stats.ignorar}</Badge>
              {stats.pendentesConfirmacao > 0 && (
                <>
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {stats.pendentesConfirmacao} vínculo(s) aguardando confirmação
                  </Badge>
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={confirmarTodos}>
                    Confirmar todos os vínculos
                  </Button>
                </>
              )}
              
              
              {/* Alertas de duplicidade ou não encontrados */}
              {rows.some(r => r.candidates.length > 1 && !r.alreadyImported) && (
                <Badge variant="destructive" className="animate-pulse gap-1">
                  <HelpCircle className="h-3 w-3" /> Valores Duplicados Detectados
                </Badge>
              )}
              {rows.some(r => r.candidates.length === 0 && !r.alreadyImported && r.action !== "ignorar") && (
                <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                  <AlertCircle className="h-3 w-3" /> Lançamentos não encontrados
                </Badge>
              )}
            </div>

            {reconciliacao && (
              <div
                className={`rounded-md border p-3 text-sm ${
                  reconciliacao.ok
                    ? "border-success/40 bg-success/10"
                    : "border-destructive/40 bg-destructive/10"
                }`}
              >
                <div className="flex items-center gap-2 font-medium mb-2">
                  {reconciliacao.ok ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Saldo bate com o extrato OFX
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Divergência de saldo detectada
                    </>
                  )}
                </div>
                <div className="grid gap-1 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Saldo OFX ({fmtDate(ofxMeta.ledgerBalDate ?? "")}):</span>{" "}
                    <span className="font-medium">{fmtBRL(reconciliacao.ledgerBal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Saldo esperado (sistema):</span>{" "}
                    <span className="font-medium">{fmtBRL(reconciliacao.saldoEsperado)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Diferença:</span>{" "}
                    <span className={`font-semibold ${reconciliacao.ok ? "text-success" : "text-destructive"}`}>
                      {fmtBRL(reconciliacao.diff)}
                    </span>
                  </div>
                </div>

                {!reconciliacao.ok && (extrasSistema.length > 0 || causasDelta.ignoradasImpacto !== 0) && (
                  <div className="mt-3 pt-3 border-t border-destructive/30">
                    <div className="text-xs font-medium mb-2">Possíveis causas da diferença:</div>

                    {extrasSistema.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-muted-foreground mb-1">
                          Movimentações do sistema pagas no período mas ausentes no OFX
                          (impacto: {fmtBRL(causasDelta.extrasImpacto)}):
                        </div>
                        <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto pl-3">
                          {extrasSistema.map((e) => (
                            <li key={e.id} className="flex justify-between gap-2">
                              <span className="truncate">
                                {fmtDate(e.data)} — {e.descricao || "—"}
                              </span>
                              <span className={e.tipo === "entrada" ? "text-success" : "text-destructive"}>
                                {e.tipo === "entrada" ? "+" : "-"} {fmtBRL(e.valor)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {causasDelta.ignoradasImpacto !== 0 && (
                      <div className="text-xs text-muted-foreground">
                        Transações do OFX marcadas como "Ignorar" (impacto: {fmtBRL(causasDelta.ignoradasImpacto)}).
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {ofxMeta.ledgerBal == null && rows.length > 0 && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                O arquivo OFX não informa saldo final (LEDGERBAL). Não é possível validar o caixa automaticamente.
              </div>
            )}


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
                          <span title="Sem lançamento na mesma data"><AlertCircle className="h-4 w-4 text-destructive" /></span>
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
                              // Troca manual de ação também exige confirmação do vínculo
                              confirmado: v !== "vincular",
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
                            <>
                              <Select
                                value={r.movId ?? r.candidates[0].id}
                                onValueChange={(v) => updateRow(i, { movId: v, confirmado: false })}
                              >
                                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {r.candidates.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {fmtDate(c.data_pagamento ?? c.data_vencimento ?? "")} — {c.descricao} ({fmtBRL(c.valor)})
                                      {Math.abs(c.valor - r.tx.valor) > 0.001
                                        ? ` • dif. ${fmtBRL(r.tx.valor - c.valor)} (ajusta p/ valor do banco)`
                                        : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                                <Checkbox
                                  checked={r.confirmado}
                                  onCheckedChange={(v) => updateRow(i, { confirmado: v === true })}
                                />
                                <span className={r.confirmado ? "text-success" : "text-destructive font-medium"}>
                                  {r.confirmado ? "Vínculo confirmado" : "Confirmar vínculo"}
                                </span>
                                {r.sugestao === "nome" && (
                                  <Badge variant="outline" className="text-[9px]">match por nome</Badge>
                                )}
                              </label>
                            </>
                          )}
                          {r.action === "criar" && (
                            <Select
                              value={r.categoriaId ?? ""}
                              onValueChange={(v) => updateRow(i, { categoriaId: v })}
                            >
                              <SelectTrigger className={`h-7 text-xs ${!r.categoriaId ? "border-destructive" : ""}`}>
                                <SelectValue placeholder="Categoria *" />
                              </SelectTrigger>
                              <SelectContent>
                                {categorias
                                  .filter((c) => c.tipo === (r.tx.tipo === "entrada" ? "receita" : "despesa"))
                                  .map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
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
          <Button
            onClick={handleConciliar}
            disabled={rows.length === 0 || saving || rows.some((r) => r.action === "criar" && !r.categoriaId)}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Conciliar tudo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
