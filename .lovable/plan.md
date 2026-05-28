## Cálculo automático do valor para Hora Extra

Quando a categoria selecionada for "Hora Extra" (ou "Horas Extra"), calcular o campo **Valor (R$)** automaticamente como:

```
valor = (valor_diaria_padrao do colaborador / 9) * quantidade de horas
```

### Como vai funcionar

1. Em `src/pages/Diarias.tsx`, criar um helper `isHoraExtra` baseado em `descCat.includes("HORA EXTRA") || descCat.includes("HORAS EXTRA")`.
2. Calcular a quantidade de horas a partir de `form.hora_entrada` e `form.hora_saida` (diferença em minutos / 60, suportando virada de meia-noite — se saída ≤ entrada, somar 24h).
3. Buscar `valor_diaria_padrao` do colaborador selecionado (`colaboradores.find(c => c.id === form.colaborador_id)`).
4. Adicionar um `useEffect` que, sempre que mudar `colaborador_id`, `categoria_id`, `hora_entrada` ou `hora_saida`, e `isHoraExtra === true` com ambos horários preenchidos e `valor_diaria_padrao > 0`, atualiza `form.valor` para `(valor_diaria / 9) * horas` (arredondado a 2 casas).
5. O campo Valor continua editável — o usuário pode sobrescrever manualmente depois do cálculo. O cálculo só dispara quando entrada/saída/colaborador/categoria mudam.
6. Para Diária e Dobra: nada muda (valor segue vindo do `valor_diaria_padrao` ao escolher o colaborador, como já funciona hoje).
7. Exibir uma dica pequena abaixo do campo Valor quando for Hora Extra: "Calculado: diária ÷ 9 × N horas" (apenas informativo).

### Arquivo alterado

- `src/pages/Diarias.tsx` — helper `isHoraExtra`, função `calcHoras`, `useEffect` de cálculo, hint visual no campo Valor.

Sem mudança de schema, hooks ou outras telas.