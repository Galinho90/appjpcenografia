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
      lancamentos: {
        Row: {
          categoria_id: string
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
          status?: string
          updated_at?: string
          valor?: number
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
    },
  },
} as const
