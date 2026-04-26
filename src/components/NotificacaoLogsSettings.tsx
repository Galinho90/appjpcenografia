import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, RefreshCw, Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LogRow = {
  id: string;
  evento: string;
  template_key: string | null;
  nota_fiscal_id: string | null;
  recipient_email: string | null;
  subject: string | null;
  status: "sent" | "failed" | "skipped";
  error_message: string | null;
  payload: any;
  created_at: string;
};

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  sent: { label: "Enviado", cls: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30" },
  failed: { label: "Falhou", cls: "bg-destructive/15 text-destructive hover:bg-destructive/20 border-destructive/30" },
  skipped: { label: "Ignorado", cls: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-500/30" },
};

const eventoLabel = (e: string) =>
  e
    .replace(/^nota_fiscal_/, "Nota fiscal — ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function NotificacaoLogsSettings() {
  const [evento, setEvento] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [notaId, setNotaId] = useState<string>("");
  const [searchNota, setSearchNota] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [dateTo, setDateTo] = useState<Date | undefined>(() => new Date());
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: eventos = [] } = useQuery({
    queryKey: ["notificacao_log_eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacao_log")
        .select("evento")
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.evento && set.add(r.evento));
      return Array.from(set).sort();
    },
  });

  const filters = { evento, status, notaId, dateFrom, dateTo, page };
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["notificacao_log", filters],
    queryFn: async () => {
      let q = supabase
        .from("notificacao_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (evento !== "all") q = q.eq("evento", evento);
      if (status !== "all") q = q.eq("status", status);
      if (notaId.trim()) q = q.eq("nota_fiscal_id", notaId.trim());
      if (dateFrom) q = q.gte("created_at", new Date(dateFrom.setHours(0, 0, 0, 0)).toISOString());
      if (dateTo) {
        const t = new Date(dateTo);
        t.setHours(23, 59, 59, 999);
        q = q.lte("created_at", t.toISOString());
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as LogRow[], total: count ?? 0 };
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = useMemo(() => {
    const acc = { total, sent: 0, failed: 0, skipped: 0 };
    rows.forEach((r) => {
      if (r.status === "sent") acc.sent++;
      else if (r.status === "failed") acc.failed++;
      else if (r.status === "skipped") acc.skipped++;
    });
    return acc;
  }, [rows, total]);

  const limpar = () => {
    setEvento("all");
    setStatus("all");
    setNotaId("");
    setSearchNota("");
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setDateFrom(d);
    setDateTo(new Date());
    setPage(0);
  };

  const aplicarBuscaNota = () => {
    setNotaId(searchNota.trim());
    setPage(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs de Notificações</CardTitle>
        <CardDescription>
          Histórico das notificações por e-mail enviadas pelo sistema (notas fiscais aprovadas, rejeitadas, etc.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Enviados (página)" value={stats.sent} accent="text-emerald-600" />
          <StatCard label="Falhas (página)" value={stats.failed} accent="text-destructive" />
          <StatCard label="Ignorados (página)" value={stats.skipped} accent="text-amber-600" />
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Evento</Label>
            <Select value={evento} onValueChange={(v) => { setEvento(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {eventos.map((e) => (
                  <SelectItem key={e} value={e}>{eventoLabel(e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="skipped">Ignorado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Nota fiscal (UUID)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Cole o ID da nota fiscal"
                value={searchNota}
                onChange={(e) => setSearchNota(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aplicarBuscaNota()}
              />
              <Button variant="secondary" onClick={aplicarBuscaNota}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button variant="outline" onClick={limpar}><X className="h-4 w-4 mr-2" />Limpar</Button>
            <Button onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />Atualizar
            </Button>
          </div>
        </div>

        {/* Tabela */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nota fiscal</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum log encontrado para os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const isOpen = expanded === r.id;
                  const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: "" };
                  return (
                    <>
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpanded(isOpen ? null : r.id)}>
                        <TableCell>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm">{eventoLabel(r.evento)}</TableCell>
                        <TableCell className="text-sm">{r.recipient_email ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={badge.cls}>{badge.label}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">
                          {r.nota_fiscal_id ? r.nota_fiscal_id.slice(0, 8) + "…" : "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-destructive">
                          {r.error_message ?? ""}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow key={r.id + "-detail"}>
                          <TableCell colSpan={7} className="bg-muted/40">
                            <div className="grid gap-3 text-xs p-2">
                              <DetailRow label="ID do log" value={r.id} mono />
                              <DetailRow label="Nota fiscal" value={r.nota_fiscal_id ?? "—"} mono />
                              <DetailRow label="Template" value={r.template_key ?? "—"} />
                              <DetailRow label="Assunto" value={r.subject ?? "—"} />
                              {r.error_message && <DetailRow label="Erro" value={r.error_message} />}
                              <div>
                                <div className="font-medium mb-1">Payload</div>
                                <pre className="bg-background border rounded p-2 overflow-x-auto max-h-64 text-[11px]">
                                  {JSON.stringify(r.payload ?? {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} registros • Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-bold mt-1", accent)}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <div className="text-muted-foreground sm:w-32 shrink-0">{label}</div>
      <div className={cn("break-all", mono && "font-mono")}>{value}</div>
    </div>
  );
}
