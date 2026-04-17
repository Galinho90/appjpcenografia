
O usuário quer que ao cadastrar um diarista (em Colaboradores), seja criado automaticamente um usuário de login (celular + senha) com papel `visualizador`, e que esse diarista, ao logar, veja apenas um dashboard com o **próprio extrato** (read-only).

Pontos a considerar:
- Hoje `visualizador` ainda enxerga o app inteiro (rotas protegidas só por `RequireAuth`). Precisa redirecionar diaristas para uma rota dedicada e bloquear o resto.
- Precisa vincular `colaborador.id` ↔ `auth.user.id` para saber qual extrato mostrar. Adicionar coluna `user_id` em `colaboradores`.
- Criação do user precisa de service role → nova edge function `create-diarista-user` (similar à `admin-create-user`, mas só cria com role `visualizador` e devolve `user_id`).
- Form de Colaboradores já tem campo `senha` e `gerarSenha()`. Reusar.
- ExtratoDiarista existente é admin-style (escolhe diarista). Criar página nova `MeuExtrato` que força o `colaborador_id` do usuário logado, sem botões de criar lançamento, sem trocar de pessoa.

## Plano

### 1. Banco
- Migration: adicionar `colaboradores.user_id uuid` (nullable, único quando não nulo).
- Index único parcial em `user_id`.

### 2. Edge function nova: `create-diarista-user`
- Recebe `{ phone, password, nome, colaborador_id }`.
- Valida chamador admin/gerente.
- Cria user no Auth (`email_confirm: true`), insere em `user_roles` com role `visualizador`, atualiza `colaboradores.user_id`.
- Rollback se qualquer passo falhar.

### 3. Cadastro de diarista (`src/pages/Colaboradores.tsx`)
- Tornar Celular + Senha obrigatórios na criação.
- Após `createColaborador` bem-sucedido, invocar `create-diarista-user` passando o `colaborador_id` retornado.
- Mostrar toast com credenciais (celular + senha) para o admin repassar.
- Na edição, se ainda não houver `user_id`, oferecer botão "Criar acesso".

### 4. Nova página `src/pages/MeuExtrato.tsx`
- Busca `colaboradores` pelo `user_id = auth.uid()`.
- Reusa a lógica de quinzena/listagem do `ExtratoDiarista` mas **somente leitura** (sem botão "Novo lançamento", sem combobox de diarista).
- Mostra saldo, créditos, débitos, lista de lançamentos, exportar PDF.

### 5. Roteamento e gating (`src/App.tsx`, novo `RequireRole`)
- Componente `<RequireRole roles={[...]}>` que redireciona se papel não permitido.
- Rota nova `/meu-extrato` protegida só por auth.
- Aplicar `<RequireRole roles={['admin','gerente']}>` em todas as rotas atuais (exceto `/meu-extrato` e `/minha-conta`).
- Em `RequireAuth` (ou no `Index`), se `role === 'visualizador'`, redirecionar para `/meu-extrato`.

### 6. Sidebar (`src/components/AppSidebar.tsx`)
- Para `visualizador`: mostrar só "Meu Extrato" e "Minha Conta".
- Para admin/gerente: menu atual.

### 7. Login
- Sem mudanças — mesmo formulário (celular + senha) serve para diaristas. Após login, o gating redireciona para `/meu-extrato`.

### Diagrama
```text
Admin cria Colaborador
   │  nome, celular, senha
   ▼
INSERT colaboradores  ──►  edge: create-diarista-user
                              │
                              ├─► auth.admin.createUser(phone→email, senha)
                              ├─► insert user_roles(visualizador)
                              └─► update colaboradores.user_id

Diarista faz login (celular+senha)
   │
   ▼
RequireRole detecta 'visualizador' → redirect /meu-extrato
   │
   ▼
MeuExtrato lê colaboradores WHERE user_id = auth.uid()
   └─► mostra extrato read-only do próprio
```

### Observações
- Quem já é colaborador sem `user_id` não terá acesso até admin clicar em "Criar acesso" na edição.
- Se admin alterar o telefone do colaborador depois, o login continua o antigo (não sincroniza automaticamente — fora de escopo desta entrega; posso adicionar depois se quiser).
