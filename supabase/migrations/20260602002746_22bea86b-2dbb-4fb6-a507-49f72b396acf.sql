
UPDATE public.movimentacoes_financeiras
SET data_pagamento = '2026-06-01'
WHERE id IN (
  '31b13e4c-7e1c-4d7f-b9f4-ab8e352775e6',
  '6541c011-1b95-4869-b6bf-2b6d36f67332',
  '25c0233b-a4ab-4810-af7a-8ce760b78626'
);

UPDATE public.fechamentos
SET data_pagamento = '2026-06-01'
WHERE id IN (
  '3748e2bb-a54d-4117-85eb-3540b2dd21e2',
  'b5de0190-1a83-4b10-9e22-ed0178c06623',
  'd9e762bd-b96d-456a-a0ff-353044af0417'
);
