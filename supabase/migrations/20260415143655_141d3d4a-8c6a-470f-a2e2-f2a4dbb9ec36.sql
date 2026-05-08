
-- Create role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'visualizador');
  END IF;
END $$;

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is admin or gerente
CREATE OR REPLACE FUNCTION public.is_admin_or_gerente(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gerente')
  )
$$;

-- RLS for user_roles
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  telefone TEXT,
  funcao TEXT NOT NULL DEFAULT '',
  valor_diaria_padrao NUMERIC(10,2) NOT NULL DEFAULT 0,
  chave_pix TEXT,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view colaboradores" ON public.user_roles;
CREATE POLICY "Authenticated can view colaboradores"
  ON public.colaboradores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Gerente can insert colaboradores" ON public.user_roles;
CREATE POLICY "Admin/Gerente can insert colaboradores"
  ON public.colaboradores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin/Gerente can update colaboradores" ON public.user_roles;
CREATE POLICY "Admin/Gerente can update colaboradores"
  ON public.colaboradores FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete colaboradores" ON public.user_roles;
CREATE POLICY "Admin can delete colaboradores"
  ON public.colaboradores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Diarias
CREATE TABLE IF NOT EXISTS public.diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  hora_entrada TIME,
  hora_saida TIME,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view diarias" ON public.user_roles;
CREATE POLICY "Authenticated can view diarias"
  ON public.diarias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Gerente can insert diarias" ON public.user_roles;
CREATE POLICY "Admin/Gerente can insert diarias"
  ON public.diarias FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin/Gerente can update diarias" ON public.user_roles;
CREATE POLICY "Admin/Gerente can update diarias"
  ON public.diarias FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete diarias" ON public.user_roles;
CREATE POLICY "Admin can delete diarias"
  ON public.diarias FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vales
CREATE TABLE IF NOT EXISTS public.vales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view vales" ON public.user_roles;
CREATE POLICY "Authenticated can view vales"
  ON public.vales FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Gerente can insert vales" ON public.user_roles;
CREATE POLICY "Admin/Gerente can insert vales"
  ON public.vales FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin/Gerente can update vales" ON public.user_roles;
CREATE POLICY "Admin/Gerente can update vales"
  ON public.vales FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete vales" ON public.user_roles;
CREATE POLICY "Admin can delete vales"
  ON public.vales FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Reembolsos
CREATE TABLE IF NOT EXISTS public.reembolsos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view reembolsos" ON public.user_roles;
CREATE POLICY "Authenticated can view reembolsos"
  ON public.reembolsos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Gerente can insert reembolsos" ON public.user_roles;
CREATE POLICY "Admin/Gerente can insert reembolsos"
  ON public.reembolsos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin/Gerente can update reembolsos" ON public.user_roles;
CREATE POLICY "Admin/Gerente can update reembolsos"
  ON public.reembolsos FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete reembolsos" ON public.user_roles;
CREATE POLICY "Admin can delete reembolsos"
  ON public.reembolsos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fechamentos
CREATE TABLE IF NOT EXISTS public.fechamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  total_diarias NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_vales NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_reembolsos NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fechamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view fechamentos" ON public.user_roles;
CREATE POLICY "Authenticated can view fechamentos"
  ON public.fechamentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Gerente can insert fechamentos" ON public.user_roles;
CREATE POLICY "Admin/Gerente can insert fechamentos"
  ON public.fechamentos FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin/Gerente can update fechamentos" ON public.user_roles;
CREATE POLICY "Admin/Gerente can update fechamentos"
  ON public.fechamentos FOR UPDATE TO authenticated
  USING (public.is_admin_or_gerente(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete fechamentos" ON public.user_roles;
CREATE POLICY "Admin can delete fechamentos"
  ON public.fechamentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Transacoes Log
CREATE TABLE IF NOT EXISTS public.transacoes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fechamento_id UUID REFERENCES public.fechamentos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'pix',
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  resposta_api JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transacoes_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view transacoes" ON public.user_roles;
CREATE POLICY "Authenticated can view transacoes"
  ON public.transacoes_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage transacoes" ON public.user_roles;
CREATE POLICY "Admin can manage transacoes"
  ON public.transacoes_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fechamentos_updated_at
  BEFORE UPDATE ON public.fechamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
