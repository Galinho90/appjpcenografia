export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean
          cor: string
          created_at: string
          icone: string
          id: string
          nome: string
          sistema: boolean
          tipo: Database["public"]["Enums"]["tipo_categoria_financeira"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome: string
          sistema?: boolean
          tipo: Database["public"]["Enums"]["tipo_categoria_financeira"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          sistema?: boolean
          tipo?: Database["public"]["Enums"]["tipo_categoria_financeira"]
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          email: string | null
          id: string
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          chave_pix: string | null
          conta: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string | null
          foto_url: string | null
          funcao: string
          id: string
          nome: string
          pix: string | null
          rg: string | null
          senha_hash: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
          valor_diaria_padrao: number
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          chave_pix?: string | null
          conta?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          foto_url?: string | null
          funcao?: string
          id?: string
          nome: string
          pix?: string | null
          rg?: string | null
          senha_hash?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          valor_diaria_padrao?: number
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          chave_pix?: string | null
          conta?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          foto_url?: string | null
          funcao?: string
          id?: string
          nome?: string
          pix?: string | null
          rg?: string | null
          senha_hash?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          valor_diaria_padrao?: number
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          apelido: string
          ativo: boolean
          banco: string
          conta: string | null
          created_at: string
          id: string
          integracao_id: string | null
          observacoes: string | null
          saldo_inicial: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          apelido: string
          ativo?: boolean
          banco: string
          conta?: string | null
          created_at?: string
          id?: string
          integracao_id?: string | null
          observacoes?: string | null
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          apelido?: string
          ativo?: boolean
          banco?: string
          conta?: string | null
          created_at?: string
          id?: string
          integracao_id?: string | null
          observacoes?: string | null
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_integracao_id_fkey"
            columns: ["integracao_id"]
            isOneToOne: false
            referencedRelation: "integracoes_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      diarias: {
        Row: {
          colaborador_id: string
          created_at: string
          data: string
          hora_entrada: string | null
          hora_saida: string | null
          id: string
          observacoes: string | null
          valor: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data: string
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          observacoes?: string | null
          valor?: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data?: string
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          observacoes?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "diarias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          context: string | null
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          triggered_by: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          triggered_by?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html: string
          id: string
          key: string
          subject: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          html: string
          id?: string
          key: string
          subject: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          html?: string
          id?: string
          key?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      extrato_inter: {
        Row: {
          conciliado: boolean
          conta_id: string
          contraparte: string | null
          created_at: string
          data: string
          descricao: string | null
          id: string
          id_transacao: string
          movimentacao_id: string | null
          raw: Json | null
          tipo: string
          valor: number
        }
        Insert: {
          conciliado?: boolean
          conta_id: string
          contraparte?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          id_transacao: string
          movimentacao_id?: string | null
          raw?: Json | null
          tipo: string
          valor: number
        }
        Update: {
          conciliado?: boolean
          conta_id?: string
          contraparte?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          id_transacao?: string
          movimentacao_id?: string | null
          raw?: Json | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_inter_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extrato_inter_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos: {
        Row: {
          colaborador_id: string
          created_at: string
          id: string
          periodo_fim: string
          periodo_inicio: string
          status: string
          total_diarias: number
          total_reembolsos: number
          total_vales: number
          updated_at: string
          valor_final: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          id?: string
          periodo_fim: string
          periodo_inicio: string
          status?: string
          total_diarias?: number
          total_reembolsos?: number
          total_vales?: number
          updated_at?: string
          valor_final?: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          total_diarias?: number
          total_reembolsos?: number
          total_vales?: number
          updated_at?: string
          valor_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_bancarias: {
        Row: {
          ambiente: string
          apelido: string
          ativo: boolean
          banco: string
          conta_corrente: string | null
          created_at: string
          id: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          apelido: string
          ativo?: boolean
          banco: string
          conta_corrente?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          apelido?: string
          ativo?: boolean
          banco?: string
          conta_corrente?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria_id: string
          cliente_id: string | null
          colaborador_id: string
          created_at: string
          data: string
          descricao: string | null
          fechamento_id: string | null
          hora_entrada: string | null
          hora_saida: string | null
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id: string
          cliente_id?: string | null
          colaborador_id: string
          created_at?: string
          data: string
          descricao?: string | null
          fechamento_id?: string | null
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria_id?: string
          cliente_id?: string | null
          colaborador_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          fechamento_id?: string | null
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_financeiras: {
        Row: {
          categoria_id: string | null
          cliente_id: string | null
          colaborador_id: string | null
          comprovante_url: string | null
          conta_destino_id: string | null
          conta_id: string
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          fechamento_id: string | null
          id: string
          id_externo: string | null
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_movimentacao"]
          recorrencia_config: Json | null
          recorrente: boolean
          status: Database["public"]["Enums"]["status_movimentacao"]
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          comprovante_url?: string | null
          conta_destino_id?: string | null
          conta_id: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          fechamento_id?: string | null
          id?: string
          id_externo?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_movimentacao"]
          recorrencia_config?: Json | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["status_movimentacao"]
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          comprovante_url?: string | null
          conta_destino_id?: string | null
          conta_id?: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          fechamento_id?: string | null
          id?: string
          id_externo?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_movimentacao"]
          recorrencia_config?: Json | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["status_movimentacao"]
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_financeiras_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string
          colaborador_id: string
          created_at: string
          data_emissao: string | null
          fechamento_id: string
          id: string
          numero: string | null
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          rejeitada_em: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url: string
          colaborador_id: string
          created_at?: string
          data_emissao?: string | null
          fechamento_id: string
          id?: string
          numero?: string | null
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          rejeitada_em?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string
          colaborador_id?: string
          created_at?: string
          data_emissao?: string | null
          fechamento_id?: string
          id?: string
          numero?: string | null
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          rejeitada_em?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      notificacao_log: {
        Row: {
          created_at: string
          error_message: string | null
          evento: string
          id: string
          nota_fiscal_id: string | null
          payload: Json | null
          recipient_email: string | null
          status: string
          subject: string | null
          template_key: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          evento: string
          id?: string
          nota_fiscal_id?: string | null
          payload?: Json | null
          recipient_email?: string | null
          status: string
          subject?: string | null
          template_key?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          evento?: string
          id?: string
          nota_fiscal_id?: string | null
          payload?: Json | null
          recipient_email?: string | null
          status?: string
          subject?: string | null
          template_key?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          lida_em: string | null
          link: string | null
          mensagem: string
          metadata: Json | null
          status: string
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          link?: string | null
          mensagem: string
          metadata?: Json | null
          status?: string
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          lida_em?: string | null
          link?: string | null
          mensagem?: string
          metadata?: Json | null
          status?: string
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      smtp_config: {
        Row: {
          ativo: boolean
          created_at: string
          from_email: string
          from_name: string | null
          host: string
          id: string
          password_encrypted: string
          port: number
          secure: string
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          from_email: string
          from_name?: string | null
          host: string
          id?: string
          password_encrypted: string
          port?: number
          secure?: string
          updated_at?: string
          updated_by?: string | null
          username: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          from_email?: string
          from_name?: string | null
          host?: string
          id?: string
          password_encrypted?: string
          port?: number
          secure?: string
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: []
      }
      transacoes_log: {
        Row: {
          created_at: string
          fechamento_id: string
          id: string
          resposta_api: Json | null
          status: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          fechamento_id: string
          id?: string
          resposta_api?: Json | null
          status?: string
          tipo?: string
          valor?: number
        }
        Update: {
          created_at?: string
          fechamento_id?: string
          id?: string
          resposta_api?: Json | null
          status?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_log_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_company_branding: {
        Args: never
        Returns: {
          id: string
          logo_url: string
          nome_fantasia: string
          razao_social: string
        }[]
      }
      get_saldo_conta: {
        Args: { _conta_id: string; _data_ref?: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_gerente: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gerente" | "visualizador"
      origem_movimentacao: "manual" | "fechamento" | "inter_api"
      status_movimentacao: "pendente" | "pago" | "atrasado" | "cancelado"
      tipo_categoria_financeira: "receita" | "despesa"
      tipo_movimentacao: "entrada" | "saida" | "transferencia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "visualizador"],
      origem_movimentacao: ["manual", "fechamento", "inter_api"],
      status_movimentacao: ["pendente", "pago", "atrasado", "cancelado"],
      tipo_categoria_financeira: ["receita", "despesa"],
      tipo_movimentacao: ["entrada", "saida", "transferencia"],
    },
  },
} as const
