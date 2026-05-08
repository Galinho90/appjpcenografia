
-- 1) Restrict user_roles SELECT to own user or admin/gerente
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;

CREATE POLICY "Users view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_or_gerente(auth.uid()));

-- 2) Lock down diaristas-fotos storage bucket writes
DROP POLICY IF EXISTS "Auth upload diaristas-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update diaristas-fotos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete diaristas-fotos" ON storage.objects;

CREATE POLICY "Admin/Gerente or owner upload diaristas-fotos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diaristas-fotos'
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Admin/Gerente or owner update diaristas-fotos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diaristas-fotos'
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Admin/Gerente or owner delete diaristas-fotos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'diaristas-fotos'
  AND (
    public.is_admin_or_gerente(auth.uid())
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- 3) Restrict Realtime subscriptions so users only receive their own notification events
DROP POLICY IF EXISTS "Users receive own notification events" ON realtime.messages;

CREATE POLICY "Users receive own notification events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notif-' || auth.uid()::text
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
