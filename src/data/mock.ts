import { Colaborador, Diaria, Vale, Reembolso, Fechamento } from '@/types';

export const mockColaboradores: Colaborador[] = [
  {
    id: '1', nome: 'Carlos Silva', cpf: '123.456.789-00', telefone: '(11) 99999-1111',
    funcao: 'Montador', valor_diaria_padrao: 200, chave_pix: '123.456.789-00',
    banco: 'Inter', agencia: '0001', conta: '12345-6', created_at: '2024-01-10', ativo: true,
  },
  {
    id: '2', nome: 'Ana Oliveira', cpf: '987.654.321-00', telefone: '(11) 99999-2222',
    funcao: 'Eletricista', valor_diaria_padrao: 250, chave_pix: 'ana@email.com',
    banco: 'Inter', agencia: '0001', conta: '65432-1', created_at: '2024-02-15', ativo: true,
  },
  {
    id: '3', nome: 'João Santos', cpf: '456.789.123-00', telefone: '(11) 99999-3333',
    funcao: 'Pintor', valor_diaria_padrao: 180, chave_pix: '(11)99999-3333',
    banco: 'Inter', agencia: '0001', conta: '78901-2', created_at: '2024-03-01', ativo: true,
  },
  {
    id: '4', nome: 'Maria Souza', cpf: '321.654.987-00', telefone: '(11) 99999-4444',
    funcao: 'Auxiliar', valor_diaria_padrao: 150, chave_pix: 'maria@pix.com',
    banco: 'Inter', agencia: '0001', conta: '34567-8', created_at: '2024-03-20', ativo: false,
  },
];

export const mockDiarias: Diaria[] = [
  { id: '1', colaborador_id: '1', data: '2026-04-01', horario_entrada: '08:00', horario_saida: '18:00', valor: 200, observacoes: 'Evento corporativo' },
  { id: '2', colaborador_id: '2', data: '2026-04-01', horario_entrada: '07:00', horario_saida: '17:00', valor: 250, observacoes: '' },
  { id: '3', colaborador_id: '1', data: '2026-04-02', horario_entrada: '08:00', horario_saida: '18:00', valor: 200, observacoes: '' },
  { id: '4', colaborador_id: '3', data: '2026-04-03', horario_entrada: '09:00', horario_saida: '17:00', valor: 180, observacoes: 'Stand feira tech' },
  { id: '5', colaborador_id: '2', data: '2026-04-05', horario_entrada: '08:00', horario_saida: '18:00', valor: 250, observacoes: '' },
  { id: '6', colaborador_id: '1', data: '2026-04-07', horario_entrada: '07:00', horario_saida: '19:00', valor: 250, observacoes: 'Hora extra' },
];

export const mockVales: Vale[] = [
  { id: '1', colaborador_id: '1', data: '2026-04-03', valor: 100, descricao: 'Adiantamento pessoal' },
  { id: '2', colaborador_id: '2', data: '2026-04-04', valor: 150, descricao: 'Vale transporte' },
];

export const mockReembolsos: Reembolso[] = [
  { id: '1', colaborador_id: '1', data: '2026-04-02', valor: 50, descricao: 'Uber para evento' },
  { id: '2', colaborador_id: '3', data: '2026-04-03', valor: 80, descricao: 'Material comprado' },
];

export const mockFechamentos: Fechamento[] = [
  {
    id: '1', colaborador_id: '1', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-15',
    total_diarias: 650, total_vales: 100, total_reembolsos: 50, valor_final: 600, status: 'pendente',
  },
  {
    id: '2', colaborador_id: '2', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-15',
    total_diarias: 500, total_vales: 150, total_reembolsos: 0, valor_final: 350, status: 'pago',
  },
  {
    id: '3', colaborador_id: '3', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-15',
    total_diarias: 180, total_vales: 0, total_reembolsos: 80, valor_final: 260, status: 'pendente',
  },
];
