ALTER TABLE public.fechamentos ADD COLUMN IF NOT EXISTS data_pagamento date;
UPDATE public.fechamentos SET data_pagamento = periodo_fim WHERE status = 'pago' AND data_pagamento IS NULL;