ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_user_id_unique ON public.colaboradores(user_id) WHERE user_id IS NOT NULL;