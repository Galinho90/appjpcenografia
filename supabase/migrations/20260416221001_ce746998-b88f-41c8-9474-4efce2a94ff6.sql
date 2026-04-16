-- Add new fields to colaboradores
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS pix text,
  ADD COLUMN IF NOT EXISTS senha_hash text,
  ADD COLUMN IF NOT EXISTS foto_url text;

-- Create public bucket for diarista photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('diaristas-fotos', 'diaristas-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for diaristas-fotos bucket
DROP POLICY IF EXISTS "Public read diaristas-fotos" ON storage.objects;
CREATE POLICY "Public read diaristas-fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'diaristas-fotos');

DROP POLICY IF EXISTS "Anon upload diaristas-fotos" ON storage.objects;
CREATE POLICY "Anon upload diaristas-fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'diaristas-fotos');

DROP POLICY IF EXISTS "Anon update diaristas-fotos" ON storage.objects;
CREATE POLICY "Anon update diaristas-fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'diaristas-fotos');

DROP POLICY IF EXISTS "Anon delete diaristas-fotos" ON storage.objects;
CREATE POLICY "Anon delete diaristas-fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'diaristas-fotos');