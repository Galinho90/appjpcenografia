import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContasBancarias, useMovimentacoes, useSaldoContas, useSaldosPorDia,
} from "@/hooks/useFinanceiro";
import { fmtBRL } from "@/lib/financeiro";
import { PeriodoToolbar, type PeriodoPreset } from "@/components/financeiro/dashboard/PeriodoToolbar";
import { SaldoHero, type SaldoPoint } from "@/components/financeiro/dashboard/SaldoHero";
import { FluxoPeriodoChart, type FluxoBucket } from "@/components/financeiro/dashboard/FluxoPeriodoChart";
import { CategoriaBreakdown } from "@/components/financeiro/dashboard/CategoriaBreakdown";
import { AgendaCard } from "@/components/financeiro/dashboard/AgendaCard";

/** ISO local (evita o shift de fuso do toISOString) */
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function rangeFromPreset(preset: PeriodoPreset, hoje: Date): { inicio: Date; fim: Date } | null {
  const y = hoje.getFullYear();
  const m = hoje.getMonth();
  switch (preset) {
    case "mes": return { inicio: new Date(y, m, 1), fim: new Date(y, m + 1, 0) };
    case "mes_anterior": return { inicio: new Date(y, m - 1, 1), fim: new Date(y, m, 0) };
    case "30d": return { inicio: addDays(hoje, -29), fim: hoje };
    case "ano": return { inicio: new Date(y, 0, 1), fim: new Date(y, 11, 31) };
    default: return null;
  }
}

export default function FinanceiroDashboard() {
  const hoje = new Date();
  const { data: contas = [], isLoading: loadingContas } = useContasBancarias();
  const [contaId, setContaId] = useState<string>("all");
  const [preset, setPreset] = useState<PeriodoPreset>("mes");
  const [dataInicio, setDataInicio] = useState<Date>(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [dataFim, setDataFim] = useState<Date>(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));

  const handlePreset = (p: PeriodoPreset) => {
    setPreset(p);
    const r = rangeFromPreset(p, hoje);
    if (r) { setDataInicio(r.inicio); setDataFim(r.fim); }
  };

  const inicioStr = toISO(dataInicio);
  const fimStr = toISO(dataFim);
  const hojeStr = toISO(hoje);

  // Saldo de caixa: nunca projetado para trás de hoje
  const contasSelecionadas = contaId === "all" ? contas.map((c) => c.id) : [contaId];
  const saldoRef = fimStr > hojeStr ? fimStr : hojeStr;
  const { data: saldo = 0 } = useSaldoContas(contasSelecionadas, saldoRef);
  const { data: saldosPorDia } = useSaldosPorDia(contaId);

  const { data: todasMovs = [], isLoading } = useMovimentacoes({
    contaId: contaId === "all" ? undefined : contaId,
  });

  const dataEfetiva = (m: typeof todasMovs[number]) =>
    m.status === "pago" ? (m.data_pagamento ?? m.data_vencimento) : m.data_vencimento;

  const movs = useMemo(
    () => todasMovs.filter((m) => {
      const d = dataEfetiva(m);
      return d ? d >= inicioStr && d <= fimStr : false;
    }),
    [todasMovs, inicioStr, fimStr],
  );

  const pagos = useMemo(() => movs.filter((m) => m.status === "pago"), [movs]);
  const entradas = pagos.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
  const saidas = pagos.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
  const resultado = entradas - saidas;

  /** Série de saldo diário dentro do período (carrega o último saldo conhecido) */
  const serieSaldo = useMemo<SaldoPoint[]>(() => {
    if (!saldosPorDia || saldosPorDia.size === 0) return [];
    const dias = [...saldosPorDia.keys()].sort();
    let ultimo = 0;
    for (const d of dias) { if (d < inicioStr) ultimo = saldosPorDia.get(d)!; else break; }
    const pontos: SaldoPoint[] = [];
    const limite = fimStr > hojeStr ? hojeStr : fimStr;
    for (let d = new Date(dataInicio); toISO(d) <= limite; d = addDays(d, 1)) {
      const iso = toISO(d);
      if (saldosPorDia.has(iso)) ultimo = saldosPorDia.get(iso)!;
      pontos.push({ dia: iso, saldo: ultimo });
    }
    return pontos;
  }, [saldosPorDia, inicioStr, fimStr, hojeStr, dataInicio]);

  /** Agrupamento adaptativo: por dia em períodos curtos, por mês em longos */
  const fluxo = useMemo<FluxoBucket[]>(() => {
    const dias = Math.round((dataFim.getTime() - dataInicio.getTime()) / 86_400_000) + 1;
    const porMes = dias > 45;
    const map = new Map<string, FluxoBucket>();
    for (const m of pagos) {
      const iso = dataEfetiva(m);
      if (!iso) continue;
      const [yy, mm, dd] = iso.split("-");
      const key = porMes ? `${yy}-${mm}` : iso;
      const label = porMes
        ? new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
        : `${dd}/${mm}`;
      const cur = map.get(key) ?? { label, entradas: 0, saidas: 0 };
      if (m.tipo === "entrada") cur.entradas += m.valor;
      else if (m.tipo === "saida") cur.saidas += m.valor;
      map.set(key, cur);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [pagos, dataInicio, dataFim]);

  const gastosPorCategoria = useMemo(() => {
    const map = new Map<string, { nome: string; valor: number; cor: string }>();
    for (const m of pagos) {
      if (m.tipo !== "saida" || !m.categoria) continue;
      const c = m.categoria;
      const cur = map.get(c.id) ?? { nome: c.nome, valor: 0, cor: c.cor };
      cur.valor += m.valor;
      map.set(c.id, cur);
    }
    return [...map.values()].sort((a, b) => b.valor - a.valor);
  }, [pagos]);

  const em7Dias = toISO(addDays(hoje, 7));
  const proximos = todasMovs
    .filter((m) => m.status === "pendente" && m.data_vencimento && m.data_vencimento >= hojeStr && m.data_vencimento <= em7Dias)
    .sort((a, b) => (a.data_vencimento ?? "").localeCompare(b.data_vencimento ?? ""))
    .slice(0, 6);

  const atrasadas = todasMovs.filter(
    (m) => m.status === "pendente" && m.data_vencimento && m.data_vencimento < hojeStr,
  );

  const periodoLabel = `${dataInicio.toLocaleDateString("pt-BR")} — ${dataFim.toLocaleDateString("pt-BR")} · ${pagos.length} lançamento(s) · ${fmtBRL(entradas)} entradas`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Visão de caixa, resultado e agenda de vencimentos</p>
      </div>

      <PeriodoToolbar
        preset={preset}
        onPresetChange={handlePreset}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicio={setDataInicio}
        onDataFim={setDataFim}
        contas={contas}
        contaId={contaId}
        onContaChange={setContaId}
      />

      {isLoading || loadingContas ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl lg:col-span-2" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      ) : (
        <SaldoHero
          saldo={saldo}
          entradas={entradas}
          saidas={saidas}
          resultado={resultado}
          serie={serieSaldo}
          periodoLabel={periodoLabel}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <FluxoPeriodoChart data={fluxo} />
        <CategoriaBreakdown data={gastosPorCategoria} />
      </div>

      <AgendaCard proximos={proximos} atrasadas={atrasadas} />
    </div>
  );
}
