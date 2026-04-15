export type AppRole = 'admin' | 'gerente' | 'visualizador';

export interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  funcao: string;
  valor_diaria_padrao: number;
  chave_pix: string;
  banco: string;
  agencia: string;
  conta: string;
  created_at: string;
  ativo: boolean;
}

export interface Diaria {
  id: string;
  colaborador_id: string;
  data: string;
  horario_entrada: string;
  horario_saida: string;
  valor: number;
  observacoes: string;
  colaborador?: Colaborador;
}

export interface Vale {
  id: string;
  colaborador_id: string;
  data: string;
  valor: number;
  descricao: string;
  colaborador?: Colaborador;
}

export interface Reembolso {
  id: string;
  colaborador_id: string;
  data: string;
  valor: number;
  descricao: string;
  colaborador?: Colaborador;
}

export type FechamentoStatus = 'pendente' | 'pago' | 'erro';

export interface Fechamento {
  id: string;
  colaborador_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  total_diarias: number;
  total_vales: number;
  total_reembolsos: number;
  valor_final: number;
  status: FechamentoStatus;
  colaborador?: Colaborador;
}

export interface TransacaoLog {
  id: string;
  fechamento_id: string;
  colaborador_id: string;
  valor: number;
  status: string;
  resposta_api: string;
  created_at: string;
}
