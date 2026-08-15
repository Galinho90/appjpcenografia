# Plan: Implementação do Módulo de Eventos Financeiros

Implementar um sistema de gestão de eventos para controle de orçamento (verba), custos e lucratividade, integrado ao módulo financeiro existente.

## 1. Banco de Dados (Supabase)

Criar as tabelas necessárias no Supabase para armazenar os eventos e seus custos associados.

- **public.eventos**:
  - `id`: UUID (PK)
  - `nome`: TEXT (NOT NULL)
  - `descricao`: TEXT
  - `verba`: NUMERIC(15,2) (NOT NULL, DEFAULT 0) - Orçamento inicial
  - `status`: TEXT (CHECK status IN ('planejado', 'em_andamento', 'concluido', 'cancelado'))
  - `data_inicio`: DATE
  - `data_fim`: DATE
  - `created_at` / `updated_at`: TIMESTAMPTZ

- **public.evento_custos**:
  - `id`: UUID (PK)
  - `evento_id`: UUID (FK references public.eventos, ON DELETE CASCADE)
  - `descricao`: TEXT (NOT NULL)
  - `valor`: NUMERIC(15,2) (NOT NULL)
  - `categoria_id`: UUID (FK references public.categorias_financeiras, opcional)
  - `movimentacao_id`: UUID (FK references public.movimentacoes_financeiras, opcional) - Para vincular a uma saída real no caixa
  - `created_at`: TIMESTAMPTZ

## 2. Backend & Hooks (Frontend)

- Criar `src/hooks/useEventos.ts`:
  - `useEventos()`: Listar todos os eventos.
  - `useEvento(id)`: Obter detalhes de um evento específico com seus custos.
  - `useCreateEvento()`, `useUpdateEvento()`, `useDeleteEvento()`.
  - `useAddCustoEvento()`, `useRemoveCustoEvento()`.
- Atualizar `src/hooks/useFinanceiro.ts` para incluir referências cruzadas se necessário.

## 3. Interface do Usuário (UI/UX)

- **Nova Página: `src/pages/financeiro/Eventos.tsx`**
  - Grid de cards ou tabela exibindo eventos.
  - Indicadores rápidos por evento: Verba, Custo Total, Lucro/Saldo Restante, % de Utilização.
  - Modal de cadastro/edição de Evento.
- **Detalhes do Evento (Modal ou Página Lateral):**
  - Lista de custos associados.
  - Formulário para adicionar novos custos.
  - Visualização gráfica simples (Barra de progresso da verba).
- **Integração com Movimentações:**
  - Adicionar campo "Evento" no formulário de Movimentação Financeira (`src/pages/financeiro/Movimentacoes.tsx`) para permitir vincular uma despesa/receita a um evento.

## 4. Navegação

- Adicionar o item "Eventos" no `src/components/AppSidebar.tsx` dentro da seção "Financeiro".
- Registrar a rota `/financeiro/eventos` no `src/App.tsx`.

## Requisitos Técnicos
- Utilizar Shadcn/UI para componentes.
- Manter o padrão visual "Glassmorphism" e sombras premium já estabelecidos.
- Cálculos de lucro realizados via `useMemo` no frontend para feedback imediato, mas validados por triggers ou queries eficientes.

### 📊 Relatório de Execução

**Padrão utilizado:** Feature Implementation (Full Stack)

**Sub-agentes ativados:**
- 🎨 **UI Architect** — ✅ Planejado
- 🗄️ **Supabase Engineer** — ✅ Planejado
- 🔍 **Code Auditor** — ✅ Planejado
- 🚀 **Deploy Ops** — ➖ Não necessário

**Resumo:** Plano detalhado para criação do módulo de Eventos com gestão de custos e verba.
**Arquivos a serem modificados:** Aprox. 5-7 arquivos.
