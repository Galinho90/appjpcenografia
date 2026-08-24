import type { MovimentacaoFinanceira } from "@/hooks/useFinanceiro";

/**
 * Estado de conciliação bancária de uma movimentação.
 *
 * Regra de negócio:
 * - `conciliada`     -> possui `fitid`, ou seja, foi casada com uma transação
 *                       real do extrato bancário (importação OFX / API do banco).
 * - `nao_conciliada` -> já está paga (afeta o caixa) mas nunca foi casada com o
 *                       extrato. É exatamente o que faz o saldo do dia divergir
 *                       do saldo real da conta.
 * - `nao_aplicavel`  -> lançamento previsto (pendente/atrasado) ou cancelado;
 *                       ainda não existe no extrato, logo não há o que conciliar.
 */
export type EstadoConciliacao = "conciliada" | "nao_conciliada" | "nao_aplicavel";

/** Filtro de conciliação usado na página de Movimentações. */
export type FiltroConciliacao = "all" | "conciliada" | "nao_conciliada";

type MovConciliavel = Pick<MovimentacaoFinanceira, "status"> & { fitid?: string | null };

export function getEstadoConciliacao(m: MovConciliavel): EstadoConciliacao {
  // Defensivo: status ausente é tratado como não aplicável.
  if (!m || m.status !== "pago") return "nao_aplicavel";
  const fitid = m.fitid?.trim?.() ?? "";
  return fitid.length > 0 ? "conciliada" : "nao_conciliada";
}

export function matchFiltroConciliacao(m: MovConciliavel, filtro: FiltroConciliacao): boolean {
  if (filtro === "all") return true;
  return getEstadoConciliacao(m) === filtro;
}
