-- Tabela de configuração SMTP (linha única)
CREATE TABLE public.smtp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 587,
  secure TEXT NOT NULL DEFAULT 'tls' CHECK (secure IN ('tls','ssl','none')),
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view smtp_config"
  ON public.smtp_config FOR SELECT TO authenticated
  USING (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin/Gerente insert smtp_config"
  ON public.smtp_config FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin/Gerente update smtp_config"
  ON public.smtp_config FOR UPDATE TO authenticated
  USING (is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin can delete smtp_config"
  ON public.smtp_config FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_smtp_config_updated_at
  BEFORE UPDATE ON public.smtp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de log de envios
CREATE TABLE public.email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message TEXT,
  triggered_by UUID,
  context TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view email_log"
  ON public.email_log FOR SELECT TO authenticated
  USING (is_admin_or_gerente(auth.uid()));

CREATE INDEX idx_email_log_created_at ON public.email_log(created_at DESC);

-- Tabela de tokens de redefinição de senha (fluxo próprio via SMTP)
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens só são manipulados via Edge Function com service role; sem políticas para usuários comuns.
CREATE POLICY "Admin view password_reset_tokens"
  ON public.password_reset_tokens FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);