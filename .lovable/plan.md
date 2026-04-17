
## Login por celular + senha (sem SMS), cadastro só por admin

### Abordagem
Usar Supabase Auth padrão tratando o celular como **email interno**: `5511999998888@jpcenografia.local`. Sem SMS, sem custo, funciona já. O usuário digita só o celular na tela; convertemos internamente.

### Mudanças

**1. `src/hooks/useAuth.tsx` (novo)**
Provider com `session`, `user`, `role`, `signIn(phone, password)`, `signOut()`. Usa `onAuthStateChange` + `getSession` (listener antes do getSession). Busca role em `user_roles` após login.

**2. `src/pages/Login.tsx`**
- Campo único "Celular" com máscara `(11) 99999-8888` + senha
- Normaliza para E.164 → vira `<digits>@jpcenografia.local`
- Chama `supabase.auth.signInWithPassword({ email, password })`
- Toast de erro em PT-BR; redireciona para `/` no sucesso

**3. `src/App.tsx`**
- Envolver com `<AuthProvider>`
- Componente `<RequireAuth>` que redireciona para `/login` se sem sessão
- Aplicar em todas as rotas exceto `/login`

**4. `src/components/AppSidebar.tsx`**
- Mostrar nome/celular do usuário logado no rodapé
- Botão "Sair" que chama `signOut()` e redireciona para `/login`

**5. `src/pages/Configuracoes.tsx` — aba "Usuários e papéis"**
Substituir tabela read-only por gestão real:
- Form "Cadastrar usuário": nome, celular, senha inicial, papel (admin/gerente/visualizador)
- Edge function `admin-create-user` (necessária — `auth.admin.createUser` só funciona com service role)
- Lista de usuários com papel atual e botões "Alterar papel" / "Remover acesso"
- Visível só para admin

**6. Edge function `supabase/functions/admin-create-user/index.ts` (nova)**
- Recebe: `{ phone, password, nome, role }`
- Valida que o chamador é admin (via JWT + has_role)
- Cria usuário com `supabase.auth.admin.createUser({ email: phoneToEmail(phone), password, email_confirm: true, user_metadata: { nome, phone } })`
- Insere em `user_roles`
- Usa `SUPABASE_SERVICE_ROLE_KEY` (já configurado)

**7. Migration: primeiro admin**
Como hoje não há nenhum usuário, preciso criar o primeiro admin manualmente. Duas opções (vou usar a 2):
- Você cria pelo painel Supabase e me passa o user_id
- **Crio uma edge function `bootstrap-first-admin`** que só funciona se `user_roles` estiver vazia, cria um admin com celular/senha que você definir no primeiro acesso à tela de login (ou via um botão único "Configurar primeiro acesso")

### Pontos importantes
- Painel Supabase → Auth → Providers → Email: deixar **"Confirm email" desativado** (sem isso, usuários criados ficariam pendentes). A edge function usa `email_confirm: true` para já criar confirmado, então não precisa mexer no painel.
- Primeiro login: tela de login mostra link "Configurar primeiro acesso" só enquanto `user_roles` estiver vazia (chamada à edge `bootstrap-first-admin`).
- Depois que houver admin, esse link some e só admin cria novos usuários pela aba Configurações → Usuários.

### Diagrama do fluxo
```text
Login.tsx
  celular + senha
        │
        ▼
  phoneToEmail()  ──►  signInWithPassword({ email, password })
        │
        ▼
  AuthProvider (session + role)
        │
        ▼
  RequireAuth ──► rotas protegidas

Configurações → Usuários (admin)
        │
        ▼
  edge: admin-create-user (service role)
        │
        ├─► auth.admin.createUser
        └─► insert user_roles
```
