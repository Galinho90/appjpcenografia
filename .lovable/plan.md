## Objetivo

Adicionar, em cada fechamento pendente, um botão **"Pagar via PIX"** que envie o pagamento para a `chave_pix` do colaborador usando o banco marcado como **ativo** nas integrações.

## Situação atual

- Já existe a edge function `c6-pix-pagamento` (C6 Bank, opera em modo MOCK sem credenciais).
- A memória do projeto cita **Banco Inter** como banco padrão para PIX.
- **Não existe** tabela de integrações bancárias nem tela para gerenciá-las.
- A coluna `colaboradores.chave_pix` já existe.

## Plano

### 1. Banco de dados — nova tabela `integracoes_bancarias`

Campos principais (sem incluir id/timestamps):
- `banco` (text: `inter` | `c6`)
- `apelido` (text)
- `ativo` (boolean) — apenas **uma** integração ativa por vez (trigger garante)
- `ambiente` (text: `homolog` | `producao`)
- `conta_corrente` (text)
- `observacoes` (text, opcional)

RLS: somente `admin` (select, insert, update, delete). Credenciais sensíveis (client_id, client_secret, certificados) **continuam em secrets** do Supabase, nunca no banco.

### 2. Edge function `inter-pix-pagamento`

Nova função no padrão da `c6-pix-pagamento`:
- Valida JWT e papel `admin`.
- Lê secrets `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_CERT_PEM`, `INTER_KEY_PEM`, `INTER_CONTA_CORRENTE`.
- Sem credenciais → modo MOCK (igual à C6).
- Grava em `transacoes_log` e marca `fechamentos.status = 'pago'` em sucesso real.

### 3. Edge function despachante `pix-pagamento`

Função única chamada pelo frontend. Ela:
1. Lê `integracoes_bancarias` onde `ativo = true`.
2. Encaminha o payload para `inter-pix-pagamento` ou `c6-pix-pagamento` conforme o banco ativo.
3. Retorna erro claro se nenhuma integração ativa.

Vantagem: o frontend não precisa saber qual banco está ativo.

### 4. Frontend — página `Fechamentos.tsx`

Para cada linha **pendente** com `colaborador.chave_pix` preenchida, adicionar botão **"Pagar via PIX"** ao lado de "Marcar Pago":
- Abre `AlertDialog` mostrando colaborador, valor, chave PIX e banco ativo.
- Ao confirmar, chama `supabase.functions.invoke('pix-pagamento', { body: { fechamento_id, valor, chave_pix, favorecido } })`.
- Toast de sucesso/erro; em sucesso, invalida queries de fechamentos.
- Botão desabilitado (com tooltip) quando: sem chave PIX, sem integração ativa, ou enquanto a request está em andamento.

Botão "Marcar Pago" continua existindo como fallback manual.

### 5. Nova página `Integrações` em Configurações

Tela admin para:
- Listar `integracoes_bancarias`.
- Criar/editar/excluir.
- Toggle "Ativar" (deixa as outras inativas via trigger).
- Botão "Configurar credenciais" que abre instruções para adicionar os secrets do banco escolhido.

Item de menu na sidebar (apenas admin).

## Pontos técnicos

- **Secrets necessários quando o usuário ativar Inter** (pediremos via `add_secret` apenas após confirmação): `INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_CERT_PEM`, `INTER_KEY_PEM`, `INTER_CONTA_CORRENTE`.
- mTLS no Deno edge runtime tem limitações conhecidas (mesma observação já presente em `c6-pix-pagamento`); até resolver via proxy ou runtime compatível, Inter operará em **modo MOCK** com log em `transacoes_log`.
- Logs: toda transação (mock ou real) entra em `transacoes_log` com `tipo = 'pix'` e `resposta_api` contendo a resposta crua mascarada.

## Entregáveis

1. Migration: tabela `integracoes_bancarias` + trigger de exclusividade + RLS.
2. Edge functions: `inter-pix-pagamento`, `pix-pagamento` (despachante).
3. UI: botão "Pagar via PIX" + dialog na página Fechamentos.
4. UI: nova página `Integrações Bancárias` em Configurações + rota + item de sidebar.

Confirme para eu começar pela migration.