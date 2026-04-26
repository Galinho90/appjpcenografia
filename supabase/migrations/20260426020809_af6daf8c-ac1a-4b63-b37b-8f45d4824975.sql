-- Tabela de templates de e-mail
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  subject text NOT NULL,
  html text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Gerente view email_templates"
  ON public.email_templates FOR SELECT TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin/Gerente insert email_templates"
  ON public.email_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin/Gerente update email_templates"
  ON public.email_templates FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

CREATE POLICY "Admin can delete email_templates"
  ON public.email_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Templates padrão
INSERT INTO public.email_templates (key, description, subject, html, variables) VALUES
('password_reset',
 'E-mail enviado quando um colaborador solicita ou recebe um link de redefinição de senha.',
 'Redefinição de senha — {{empresa}}',
 '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;">
  <h2 style="color:#111;margin:0 0 12px;">Olá, {{nome}}</h2>
  <p>Recebemos uma solicitação para redefinir a senha da sua conta em <strong>{{empresa}}</strong>.</p>
  <p>Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{{link}}" style="background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Redefinir minha senha</a>
  </p>
  <p style="font-size:12px;color:#666;">Se você não solicitou, basta ignorar este e-mail.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="font-size:12px;color:#999;">{{empresa}}</p>
</div>',
 '["nome","empresa","link"]'::jsonb),

('test_email',
 'E-mail enviado pelo botão "Enviar e-mail de teste" nas configurações de SMTP.',
 'E-mail de teste — {{empresa}}',
 '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;">
  <h2 style="color:#111;margin:0 0 12px;">Funcionou! 🎉</h2>
  <p>Este é um e-mail de teste enviado pelo sistema <strong>{{empresa}}</strong>.</p>
  <p>Se você recebeu, sua configuração SMTP está correta e pronta para uso.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
  <p style="font-size:12px;color:#999;">Enviado em {{data}}</p>
</div>',
 '["empresa","data"]'::jsonb)
ON CONFLICT (key) DO NOTHING;