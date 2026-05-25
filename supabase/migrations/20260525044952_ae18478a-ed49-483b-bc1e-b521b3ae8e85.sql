
-- 1. Remove sensitive senha_hash column from colaboradores (not used in app code)
ALTER TABLE public.colaboradores DROP COLUMN IF EXISTS senha_hash;

-- 2. Add explicit restrictive deny-write policies to log/token tables.
--    Service role bypasses RLS, so edge functions continue to work.

-- email_log: block all client writes
CREATE POLICY "Deny client inserts on email_log"
  ON public.email_log FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Deny client updates on email_log"
  ON public.email_log FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on email_log"
  ON public.email_log FOR DELETE TO authenticated, anon
  USING (false);

-- notificacao_log: block all client writes
CREATE POLICY "Deny client inserts on notificacao_log"
  ON public.notificacao_log FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Deny client updates on notificacao_log"
  ON public.notificacao_log FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on notificacao_log"
  ON public.notificacao_log FOR DELETE TO authenticated, anon
  USING (false);

-- password_reset_tokens: block all client writes
CREATE POLICY "Deny client inserts on password_reset_tokens"
  ON public.password_reset_tokens FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Deny client updates on password_reset_tokens"
  ON public.password_reset_tokens FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on password_reset_tokens"
  ON public.password_reset_tokens FOR DELETE TO authenticated, anon
  USING (false);
