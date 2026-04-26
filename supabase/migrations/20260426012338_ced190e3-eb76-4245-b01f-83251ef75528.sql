-- Tabela de notificações in-app
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Usuário vê suas próprias notificações
CREATE POLICY "Users view own notificacoes"
ON public.notificacoes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuário marca suas próprias como lidas
CREATE POLICY "Users update own notificacoes"
ON public.notificacoes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Admin/Gerente e o próprio usuário podem inserir (necessário para o app criar notif para outros)
CREATE POLICY "Authenticated can insert notificacoes"
ON public.notificacoes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admin pode ver todas (debug)
CREATE POLICY "Admin view all notificacoes"
ON public.notificacoes FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notificacoes_user_lida ON public.notificacoes(user_id, lida, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;