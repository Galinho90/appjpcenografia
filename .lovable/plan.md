# Módulo Financeiro — Fluxo de Caixa Empresarial

Transformar a plataforma em um sistema completo de controle financeiro com integração ao Banco Inter, dashboard analítico e contas a pagar/receber. Os fechamentos quinzenais já pagos viram automaticamente saídas no fluxo.

## 1. Novas tabelas no banco

**`contas_bancarias`** — apenas a conta Inter por enquanto, mas estrutura preparada para múltiplas
- nome, banco, agencia, conta, tipo (corrente/caixa), saldo_atual, ativo

**`categorias_financeiras`** — plano de contas
- nome, tipo (`receita` | `despesa`), cor, icone, ativo
- Seed inicial: Pagamento Diaristas, Material, Aluguel, Fornecedores, Receita Cliente, Impostos, etc.

**`movimentacoes_financeiras`** — entradas e saídas (núcleo do módulo)
- conta_id, categoria_id, tipo (`entrada`|`saida`|`transferencia`)
- valor, data_movimento, data_vencimento, data_pagamento
- status (`pendente`|`pago`|`atrasado`|`cancelado`)
- descricao, cliente_id (opcional), colaborador_id (opcional), fechamento_id (opcional — vínculo automático)
- origem (`manual`|`fechamento`|`inter_api`), id_externo_inter
- comprovante_url, recorrente (bool), recorrencia_config (jsonb)

**`extrato_inter`** — cache do extrato bruto puxado do Inter
- conta_id, id_transacao, data, valor, tipo, descricao, conciliado (bool), movimentacao_id (FK)

## 2. Integração Banco Inter

Edge function `inter-sync-extrato` que:
- Usa as credenciais Open Banking do Inter (mTLS com certificado + client_id/secret)
- Puxa extrato dos últimos N dias via `/banking/v2/extrato`
- Salva cada transação em `extrato_inter`
- Faz conciliação automática quando casa com `movimentacoes_financeiras` (mesmo valor + data próxima)
- Pode ser disparada manualmente (botão "Sincronizar") ou via cron diário

**Secrets necessários** (a pedir depois de aprovação do plano):
- `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`
- `INTER_CERTIFICATE` (PEM), `INTER_PRIVATE_KEY` (PEM)
- `INTER_CONTA_CORRENTE`

## 3. Integração com fechamentos existentes

Quando um fechamento é marcado como **pago**:
- Trigger no banco cria automaticamente uma `movimentacao_financeira` do tipo `saida`, categoria "Pagamento Diaristas", vinculada ao `fechamento_id` e `colaborador_id`
- Evita duplicidade via UNIQUE em `(fechamento_id)` quando origem = `fechamento`

## 4. Páginas frontend

**`/financeiro`** — Dashboard
- Cards: Saldo Atual, Entradas do Mês, Saídas do Mês, Resultado Líquido
- Gráfico de linha: Fluxo de caixa últimos 6 meses (entradas vs saídas)
- Gráfico de pizza: Gastos por categoria no mês
- Gráfico de barras: Comparativo mensal últimos 12 meses
- Lista compacta: Próximos vencimentos (7 dias)
- Botão "Sincronizar Inter"

**`/financeiro/movimentacoes`** — Lista completa
- Filtros: período, tipo, categoria, status, conta
- Tabela com edição inline de status
- Botão "Nova entrada" / "Nova saída" / "Transferência"
- Indicador visual de origem (manual / Inter / fechamento)

**`/financeiro/contas-pagar`** — Contas a pagar e receber
- Visão tipo kanban ou lista por status (pendente, vence em 7 dias, atrasado, pago)
- Marcar como pago em 1 clique
- Lançamentos recorrentes

**`/financeiro/categorias`** — Plano de contas (admin)
- CRUD de categorias

**`/financeiro/conciliacao`** — Conciliação Inter
- Tabela lado a lado: extrato Inter vs movimentações do sistema
- Botão para casar manualmente / criar movimentação a partir de transação não conciliada

## 5. Permissões (RLS)

- **Admin**: tudo (criar, editar, excluir, sincronizar)
- **Gerente**: somente leitura em todo módulo financeiro
- **Visualizador**: sem acesso
- Sidebar: item "Financeiro" só aparece para admin e gerente

## 6. Navegação

Adicionar na sidebar (após "Fechamentos"):
- 💰 Financeiro (com submenu: Dashboard, Movimentações, Contas a Pagar, Conciliação, Categorias)

## 7. Detalhes técnicos

- Saldo da conta calculado on-the-fly via SUM das movimentações pagas (não armazenado, evita inconsistência)
- Função SQL `get_saldo_conta(conta_id, data_ref)` para consultas rápidas
- View materializada `vw_fluxo_caixa_mensal` para os gráficos do dashboard (refresh via trigger)
- Suporte a anexo de comprovante (bucket `comprovantes-financeiros`, privado)
- Tudo em design tokens existentes (violet/green/orange)

## Ordem de implementação

1. Migration: tabelas + RLS + trigger fechamento→movimentação + seed de categorias
2. Páginas Dashboard e Movimentações (CRUD manual funcional)
3. Página Contas a Pagar/Receber + recorrência
4. Edge function `inter-sync-extrato` + página de Conciliação (depois que você fornecer os secrets do Inter)
5. Refinamentos de gráficos e relatórios

Posso começar pela fundação (passos 1 a 3) sem precisar dos secrets do Inter — a integração entra no fim. Aprova?
