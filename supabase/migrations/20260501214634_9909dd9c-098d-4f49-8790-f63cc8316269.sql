CREATE POLICY "Users delete own notificacoes"
ON public.notificacoes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);