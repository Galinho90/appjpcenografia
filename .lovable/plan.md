
# Sistema de envio de e-mail via SMTP próprio

Vamos criar um módulo SMTP independente do Supabase Auth: você cadastra as credenciais SMTP em **Configurações → SMTP**, testa a conexão, e o sistema passa a enviar e-mails (ex.: link de redefinição de senha do diarista, confirmações, notificações) usando esse SMTP via uma Edge Function.

## O que será criado

### 1. Nova aba "SMTP" em Configurações
Dentro de `src/pages/Configuracoes.tsx`, adicionar uma aba ao lado de "Empresa", "Usuários", "Preferências" e "Integrações" com os campos:

- **Host SMTP** (ex.: `smtp.gmail.com`, `smtp.office365.com`)
- **Porta** (587 / 465 / 25)
- **Segurança** (TLS / SSL / Nenhuma)
- **Usuário SMTP**
- **Senha SMTP** (campo `password`, salvo cifrado no banco)
- **E-mail remetente** (From) e **Nome remetente** (ex.: `JP Cenografia <noreply@jpcenografia.com.br>`)
- **Ativo** (switch)
- Botões **Salvar**, **Testar conexão** e **Enviar e-mail de teste** (pede um destinatário e dispara um e-mail real)

### 2. Tabela `smtp_config` no banco
Tabela única (uma linha de configuração por empresa) com RLS restringindo leitura/escrita a admin/gerente. A senha fica armazenada na tabela (cifrada do lado da Edge Function ao gravar — mais simples e suficiente para o caso) e nunca é exposta ao frontend depois de salva (o GET devolve a senha mascarada).

Campos: `host`, `port`, `secure` (`tls`/`ssl`/`none`), `username`, `password_encrypted`, `from_email`, `from_name`, `ativo`, `updated_at`, `updated_by`.

### 3. Edge Function `smtp-send`
Função única responsável por:
- Ler a config ativa de `smtp_config`
- Conectar via SMTP usando `denomailer` (biblioteca SMTP nativa do Deno)
- Enviar o e-mail (assunto, corpo HTML/texto, destinatário)
- Registrar log em `email_log` (status: enviado/falhou, erro, timestamp)

Suporta 3 modos via parâmetro `action`:
- `test_connection` — valida só a conexão (login SMTP)
- `send_test` — envia um e-mail de teste para um destinatário informado
- `send` — envia um e-mail real (chamado por outras partes do app)

### 4. Tabela `email_log`
Histórico de envios: `to`, `subject`, `status`, `error_message`, `sent_at`, `triggered_by` (user_id). Visível apenas para admin/gerente. Útil para auditoria e diagnóstico.

### 5. Caso de uso integrado: redefinição de senha do diarista
Como você queria enviar reset de senha pelo e-mail do cadastro do colaborador (e não pelo `auth.users.email`), criamos um fluxo próprio:

- Botão **"Enviar link de redefinição"** no card do colaborador
- Gera um token único (tabela `password_reset_tokens` com expiração de 1h)
- Chama `smtp-send` enviando o link para `colaboradores.email`
- Nova rota pública `/redefinir-senha?token=...` valida o token e atualiza a senha do `auth.users` correspondente via Edge Function `admin-reset-password` (já existe)

Assim o reset usa o e-mail **real** do cadastro, sem depender do e-mail sintético do Auth.

## Detalhes técnicos

- **Biblioteca SMTP**: `denomailer` (`https://deno.land/x/denomailer`) — suporta TLS/SSL, autenticação LOGIN/PLAIN, anexos.
- **Cifragem da senha SMTP**: AES-GCM usando uma chave em secret `SMTP_ENCRYPTION_KEY` (gerada e adicionada via add_secret na primeira execução). A função cifra ao gravar e decifra ao usar.
- **Validação**: Zod nos payloads das Edge Functions (`host`, `port`, `from_email`, etc.).
- **CORS**: headers padrão do Lovable em todas as respostas.
- **Auth**: as funções `smtp-send` (modos test/test_send) e a gravação de config exigem JWT válido + role admin/gerente. O modo `send` interno é chamado por outras edge functions (sem JWT) usando `SUPABASE_SERVICE_ROLE_KEY`.
- **Migrações**: `smtp_config`, `email_log`, `password_reset_tokens` + RLS + triggers de `updated_at`.

## Fluxo do usuário

1. Você abre **Configurações → SMTP**, preenche host/porta/usuário/senha/remetente, clica **Salvar**.
2. Clica **Testar conexão** → o sistema valida login SMTP e mostra "Conexão OK" ou o erro retornado pelo servidor.
3. Clica **Enviar e-mail de teste**, informa um destinatário → recebe o e-mail no inbox.
4. Em **Colaboradores**, clica em **Enviar link de redefinição** no Leandro → o link cai no `leandro.galis@gmail.com`, ele abre, define nova senha, e a senha do Auth é atualizada.

## Provedores SMTP suportados (exemplos prontos)

- Gmail (App Password): `smtp.gmail.com:587 TLS`
- Outlook 365: `smtp.office365.com:587 TLS`
- SendGrid: `smtp.sendgrid.net:587 TLS` (user `apikey`)
- Mailgun, Brevo, Amazon SES, servidor próprio cPanel — todos funcionam pela mesma tela.

## Arquivos que serão criados/alterados

- **Migrations**: criar `smtp_config`, `email_log`, `password_reset_tokens` com RLS
- **Edge Functions** (novas): `smtp-send`, `password-reset-request`, `password-reset-confirm`
- **Frontend**:
  - `src/pages/Configuracoes.tsx` — nova aba SMTP
  - `src/pages/Colaboradores.tsx` — botão "Enviar link de redefinição"
  - `src/pages/RedefinirSenha.tsx` — nova página pública
  - `src/App.tsx` — registrar rota `/redefinir-senha`

## O que NÃO faremos

- Não vamos mexer no SMTP do Supabase Auth (fica como está, ou pode ser desativado depois sem afetar nada)
- Não vamos enviar marketing/newsletter — só transacionais (reset de senha, notificações pontuais)
- Senhas SMTP nunca aparecem no frontend após salvas (apenas mascaradas)

Posso seguir com a implementação?
