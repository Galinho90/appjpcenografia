
# Plataforma de Gestão de Diaristas para Eventos

## Visão Geral
Sistema completo para gerenciar colaboradores diaristas, controlar diárias, fechamentos quinzenais e pagamentos automatizados via Banco Inter. Design moderno e colorido com cards destacados e visual vibrante.

## Design & Layout
- **Tema**: Moderno e colorido — paleta vibrante com gradientes, cards com sombras e ícones coloridos
- **Layout**: Sidebar fixa à esquerda com navegação principal + área de conteúdo à direita
- **Cores**: Primária azul-violeta (#7C3AED), acentos em verde (#10B981) e laranja (#F59E0B), fundo claro

## Autenticação & Controle de Acesso
- Login com email/senha via Supabase Auth
- 3 papéis: **Admin** (acesso total), **Gerente** (gerencia colaboradores e diárias), **Visualizador** (somente leitura)
- Tabela `user_roles` separada com RLS
- Proteção de rotas por papel

## Banco de Dados (Supabase)
Tabelas principais:
1. **colaboradores** — nome, CPF, telefone, função, valor padrão diária, chave PIX, dados bancários
2. **diarias** — colaborador_id, data, entrada, saída, valor, observações
3. **vales** — colaborador_id, data, valor, descrição
4. **reembolsos** — colaborador_id, data, valor, descrição
5. **fechamentos** — colaborador_id, período, totais calculados, valor final, status (pendente/pago/erro)
6. **transacoes_log** — logs de pagamentos via Banco Inter
7. **user_roles** — controle de papéis (admin/gerente/visualizador)

RLS em todas as tabelas com políticas baseadas em papéis.

## Páginas & Funcionalidades

### Dashboard
- Cards com métricas: total colaboradores ativos, diárias do mês, valor total pendente, pagamentos realizados
- Gráfico de custos por quinzena
- Últimas atividades

### Colaboradores
- Listagem com busca e filtros por função
- Formulário de cadastro/edição completo
- Visualização de histórico por colaborador

### Diárias
- Registro de diárias com seleção de colaborador e data
- Cálculo automático do valor (baseado no valor padrão ou edição manual)
- Calendário visual com diárias registradas

### Vales & Reembolsos
- Registro rápido de vales (adiantamentos) e reembolsos
- Listagem por colaborador e período

### Fechamento Quinzenal
- Períodos fixos: 01-15 e 16-30/31
- Cálculo automático: diárias − vales + reembolsos = valor final
- Resumo por colaborador com detalhamento
- Botão para gerar fechamento e aprovar pagamentos

### Integração Banco Inter (Edge Function)
- Edge Function para pagamento PIX via API do Banco Inter
- Armazenamento seguro de credenciais (client_id, client_secret, certificado) como secrets
- Logs de transações com status de cada pagamento
- Tratamento de erros com retry

### Relatórios
- Relatórios por colaborador, por quinzena, por período customizado
- Exportação em CSV e PDF
- Filtros avançados

## Implementação Técnica
- React + TypeScript + Tailwind + shadcn/ui
- Supabase (Auth, Database, Edge Functions, Storage para certificados)
- Recharts para gráficos do dashboard
- jsPDF + autoTable para exportação PDF
