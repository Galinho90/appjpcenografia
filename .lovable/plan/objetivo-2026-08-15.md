
## Objetivo
Adicionar uma aba de "Custos Detalhados" dentro de cada card de evento na página de Gestão de Eventos, permitindo que o usuário visualize e gerencie todos os lançamentos financeiros vinculados ao evento de forma granular.

## Tarefas Técnicas

### 1. Extensão do Hook `useEventos`
Adicionar mutações para gerenciar a tabela `evento_custos` diretamente (custos manuais simples que não são necessariamente movimentações bancárias completas, mas compõem o orçamento).

### 2. Novo Componente `EventoCustosList`
- Criar um componente dedicado para a listagem de custos.
- Exibir tanto custos da tabela `evento_custos` quanto movimentações vinculadas (`movimentacoes_financeiras`).
- Implementar formulário rápido para adicionar custos manuais.

### 3. Refatoração do Card de Evento em `Eventos.tsx`
- Implementar `Tabs` do shadcn/ui dentro do Card.
- Aba 1: **Visão Geral** (informações atuais, progresso, verba).
- Aba 2: **Custos Detalhados** (listagem e gestão de custos).

### 4. UI/UX
- Manter o padrão de glassmorphism e sombras premium.
- Garantir responsividade mobile.
- Adicionar feedback visual (toasts) para ações de custo.

## Considerações
- A tabela `movimentacoes_financeiras` já possui `evento_id`.
- A tabela `evento_custos` serve para custos previstos ou manuais que não entram no fluxo de caixa real imediatamente.
