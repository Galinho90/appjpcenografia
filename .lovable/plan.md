# Conciliação em /financeiro/movimentacoes

## Premissas
- A tabela `extrato_inter` já existe com `conciliado`, `movimentacao_id`, `conta_id`, `data`, `valor`, `tipo`.
- "Conciliado" = a movimentação possui pelo menos uma linha de extrato bancário vinculada (`extrato_inter.movimentacao_id = movimentacao.id`).
- Nenhuma coluna nova é necessária; o estado é derivado (sem `useEffect`).

## 1. Dados (`src/hooks/useFinanceiro.ts`)
- Novo hook `useConciliacaoStatus(contaId?, periodo?)`:
  - Consulta `extrato_inter` (id, conta_id, data, valor, tipo, descricao, movimentacao_id, conciliado).
  - Retorna: `Set<string>` de `movimentacao_id` conciliados + array de linhas de extrato **sem** vínculo.
- Tipagem explícita (`ExtratoLinha`, `ConciliacaoResumo`), TanStack Query com `staleTime` e `queryKey` por conta/período.

## 2. Badge de conciliação (`src/pages/financeiro/Movimentacoes.tsx`)
- Novo componente `ConciliacaoBadge` (arquivo próprio em `src/components/financeiro/ConciliacaoBadge.tsx`, < 60 linhas):
  - `conciliado` → verde (`bg-[hsl(var(--success))]`, ícone `CheckCircle2`, texto "Conciliado").
  - pendente → warning (`Clock`, "Não conciliado"), seguindo o padrão de `src/lib/statusBadge.ts`.
  - Apenas para movimentações com `status = pago` (pendentes não são conciliáveis) — pendentes exibem badge neutra "—".
- Renderizado na coluna Status da tabela desktop e no card mobile, sem quebrar linha (`whitespace-nowrap`).
- Novo filtro rápido: "Todos / Conciliados / Não conciliados" na barra de filtros existente.

## 3. Painel de pendências de conciliação
- Novo componente `src/components/financeiro/PainelConciliacao.tsx`, card glass `rounded-2xl shadow-premium`, colapsável, exibido acima da tabela:
  - **StatCards**: Saldo do sistema (conta/período), Saldo do extrato bancário, Diferença (destructive quando ≠ 0), Qtde. de itens não conciliados.
  - **Lista A** — movimentações pagas sem vínculo de extrato (com data, descrição, valor).
  - **Lista B** — linhas de extrato bancário sem movimentação correspondente.
  - Estado vazio elegante ("Tudo conciliado ✅") e skeletons no carregamento.
  - Botão "Importar OFX" reaproveitando o `ImportarOFXDialog` já existente para resolver as pendências.
- Mobile-first: 1 coluna → `md:grid-cols-2` → `lg:grid-cols-4` nos KPIs; listas com `overflow-y-auto max-h-72`.

## 4. Garantias
- Somente frontend + um hook de leitura; nenhuma migração, nenhum dado alterado.
- Tokens semânticos, sem cores hard-coded; RLS existente respeitado (apenas SELECT).
