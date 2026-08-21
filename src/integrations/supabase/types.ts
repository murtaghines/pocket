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
      accounts: {
        Row: {
          account_role: Database["public"]["Enums"]["account_role"]
          color: string | null
          created_at: string | null
          currency_base: string
          domain_default: Database["public"]["Enums"]["app_domain"] | null
          hidden_from_dashboard: boolean
          id: string
          institution: string
          is_primary: boolean
          name: string
          user_id: string
        }
        Insert: {
          account_role?: Database["public"]["Enums"]["account_role"]
          color?: string | null
          created_at?: string | null
          currency_base?: string
          domain_default?: Database["public"]["Enums"]["app_domain"] | null
          hidden_from_dashboard?: boolean
          id?: string
          institution: string
          is_primary?: boolean
          name: string
          user_id: string
        }
        Update: {
          account_role?: Database["public"]["Enums"]["account_role"]
          color?: string | null
          created_at?: string | null
          currency_base?: string
          domain_default?: Database["public"]["Enums"]["app_domain"] | null
          hidden_from_dashboard?: boolean
          id?: string
          institution?: string
          is_primary?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          diff_json: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          diff_json?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          diff_json?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          icon: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"] | null
          name: string
          parent_id: string | null
          slug: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          icon?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"] | null
          name: string
          parent_id?: string | null
          slug?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          domain?: Database["public"]["Enums"]["app_domain"]
          icon?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"] | null
          name?: string
          parent_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string | null
          id: string
          rate: number
          rate_date: string
          target_currency: string
        }
        Insert: {
          base_currency: string
          created_at?: string | null
          id?: string
          rate: number
          rate_date: string
          target_currency: string
        }
        Update: {
          base_currency?: string
          created_at?: string | null
          id?: string
          rate?: number
          rate_date?: string
          target_currency?: string
        }
        Relationships: []
      }
      import_rows: {
        Row: {
          created_at: string | null
          id: string
          import_id: string | null
          parsed_amount: number | null
          parsed_currency: string | null
          parsed_date: string | null
          parsed_description: string | null
          raw_json: Json
          row_hash_sha256: string
          row_index: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          import_id?: string | null
          parsed_amount?: number | null
          parsed_currency?: string | null
          parsed_date?: string | null
          parsed_description?: string | null
          raw_json: Json
          row_hash_sha256: string
          row_index: number
        }
        Update: {
          created_at?: string | null
          id?: string
          import_id?: string | null
          parsed_amount?: number | null
          parsed_currency?: string | null
          parsed_date?: string | null
          parsed_description?: string | null
          raw_json?: Json
          row_hash_sha256?: string
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          account_id: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          error_message: string | null
          file_hash_sha256: string
          file_mime: string | null
          file_name: string
          file_size: number | null
          file_storage_url: string | null
          id: string
          locked: boolean
          period_id: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          status: Database["public"]["Enums"]["import_status"]
          transactions_count: number | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          error_message?: string | null
          file_hash_sha256: string
          file_mime?: string | null
          file_name: string
          file_size?: number | null
          file_storage_url?: string | null
          id?: string
          locked?: boolean
          period_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["import_status"]
          transactions_count?: number | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          domain?: Database["public"]["Enums"]["app_domain"]
          error_message?: string | null
          file_hash_sha256?: string
          file_mime?: string | null
          file_name?: string
          file_size?: number | null
          file_storage_url?: string | null
          id?: string
          locked?: boolean
          period_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["import_status"]
          transactions_count?: number | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_accounts: {
        Row: {
          account_name: string
          created_at: string
          current_value: number
          id: string
          last_updated: string
          platform: string
          user_id: string
        }
        Insert: {
          account_name: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          platform: string
          user_id: string
        }
        Update: {
          account_name?: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          asset_type: string | null
          created_at: string
          date: string
          description: string
          id: string
          is_hidden: boolean
          original_text: string | null
          platform: string
          transaction_hash: string
          type: string
          upload_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          asset_type?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          is_hidden?: boolean
          original_text?: string | null
          platform: string
          transaction_hash: string
          type: string
          upload_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          asset_type?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_hidden?: boolean
          original_text?: string | null
          platform?: string
          transaction_hash?: string
          type?: string
          upload_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          closed_at: string | null
          created_at: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          id: string
          month_key: string
          status: Database["public"]["Enums"]["period_status"]
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          id?: string
          month_key: string
          status?: Database["public"]["Enums"]["period_status"]
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          domain?: Database["public"]["Enums"]["app_domain"]
          id?: string
          month_key?: string
          status?: Database["public"]["Enums"]["period_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          custom_category_rules: Json | null
          deleted_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          last_seen_at: string | null
          onboarding_answers: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_category_rules?: Json | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          onboarding_answers?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_category_rules?: Json | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          onboarding_answers?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          categorization_rule_id: string | null
          categorized_by: string | null
          category: string
          category_id: string | null
          category_source: string | null
          confidence: number | null
          counterparty_raw: string | null
          created_at: string
          currency: string | null
          date: string
          description: string
          description_clean: string | null
          description_norm: string | null
          domain: Database["public"]["Enums"]["app_domain"] | null
          fingerprint: string
          id: string
          import_id: string | null
          is_hidden: boolean
          movement: Database["public"]["Enums"]["movement_type"]
          period_id: string | null
          running_balance: number | null
          source_row_hash: string | null
          source_transaction_id: string | null
          transfer_pair_id: string | null
          user_corrected: boolean | null
          user_id: string
          user_notes: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          categorization_rule_id?: string | null
          categorized_by?: string | null
          category: string
          category_id?: string | null
          category_source?: string | null
          confidence?: number | null
          counterparty_raw?: string | null
          created_at?: string
          currency?: string | null
          date: string
          description: string
          description_clean?: string | null
          description_norm?: string | null
          domain?: Database["public"]["Enums"]["app_domain"] | null
          fingerprint: string
          id?: string
          import_id?: string | null
          is_hidden?: boolean
          movement: Database["public"]["Enums"]["movement_type"]
          period_id?: string | null
          running_balance?: number | null
          source_row_hash?: string | null
          source_transaction_id?: string | null
          transfer_pair_id?: string | null
          user_corrected?: boolean | null
          user_id: string
          user_notes?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          categorization_rule_id?: string | null
          categorized_by?: string | null
          category?: string
          category_id?: string | null
          category_source?: string | null
          confidence?: number | null
          counterparty_raw?: string | null
          created_at?: string
          currency?: string | null
          date?: string
          description?: string
          description_clean?: string | null
          description_norm?: string | null
          domain?: Database["public"]["Enums"]["app_domain"] | null
          fingerprint?: string
          id?: string
          import_id?: string | null
          is_hidden?: boolean
          movement?: Database["public"]["Enums"]["movement_type"]
          period_id?: string | null
          running_balance?: number | null
          source_row_hash?: string | null
          source_transaction_id?: string | null
          transfer_pair_id?: string | null
          user_corrected?: boolean | null
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          created_at: string
          domain: Database["public"]["Enums"]["app_domain"]
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          processed_at: string | null
          status: string
          target_month: string
          transactions_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          domain?: Database["public"]["Enums"]["app_domain"]
          error_message?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          processed_at?: string | null
          status?: string
          target_month: string
          transactions_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: Database["public"]["Enums"]["app_domain"]
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          processed_at?: string | null
          status?: string
          target_month?: string
          transactions_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          base_currency: string
          country: string | null
          created_at: string | null
          date_format: string | null
          id: string
          joint_account_names: string[] | null
          language: string
          onboarding_completed: boolean | null
          theme: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_currency?: string
          country?: string | null
          created_at?: string | null
          date_format?: string | null
          id?: string
          joint_account_names?: string[] | null
          language?: string
          onboarding_completed?: boolean | null
          theme?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_currency?: string
          country?: string | null
          created_at?: string | null
          date_format?: string | null
          id?: string
          joint_account_names?: string[] | null
          language?: string
          onboarding_completed?: boolean | null
          theme?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_rules: {
        Row: {
          applied_count: number
          category: string
          confidence: number
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          last_applied_at: string | null
          match_type: string
          movement: string
          original_description: string | null
          pattern: string
          source: string
          tokens: string[] | null
          user_id: string
        }
        Insert: {
          applied_count?: number
          category: string
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_applied_at?: string | null
          match_type?: string
          movement: string
          original_description?: string | null
          pattern: string
          source?: string
          tokens?: string[] | null
          user_id: string
        }
        Update: {
          applied_count?: number
          category?: string
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_applied_at?: string | null
          match_type?: string
          movement?: string
          original_description?: string | null
          pattern?: string
          source?: string
          tokens?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_account_breakdown: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_month_key: string
          p_user_id: string
        }
        Returns: {
          account_id: string
          account_name: string
          institution: string
          total: number
          tx_count: number
        }[]
      }
      get_account_period_summary: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: {
          account_id: string
          has_running_balance: boolean
          latest_balance: number
          tx_count: number
        }[]
      }
      get_categorization_coverage: {
        Args: { p_user_id: string }
        Returns: {
          high_confidence: number
          percent: number
          total: number
        }[]
      }
      get_category_breakdown: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_month_key: string
          p_movement: Database["public"]["Enums"]["movement_type"]
          p_user_id: string
        }
        Returns: {
          category: string
          total: number
          tx_count: number
        }[]
      }
      get_category_breakdown_range: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_end_date: string
          p_movement: Database["public"]["Enums"]["movement_type"]
          p_start_date: string
          p_user_id: string
        }
        Returns: {
          category: string
          total: number
          tx_count: number
        }[]
      }
      get_category_trends: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_granularity?: string
          p_top_n?: number
          p_user_id: string
        }
        Returns: {
          period: string
          slug: string
          total: number
        }[]
      }
      get_daily_totals: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: {
          day: string
          expenses: number
          income: number
          tx_count: number
        }[]
      }
      get_dashboard_summary: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_month_key: string
          p_user_id: string
        }
        Returns: {
          balance: number
          expenses: number
          income: number
          sent_to_invest: number
          tx_count: number
        }[]
      }
      get_essential_split: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: {
          category: string
          kind: string
          total: number
        }[]
      }
      get_investment_summary: { Args: { p_user_id: string }; Returns: Json }
      get_monthly_series: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_end_month?: string
          p_start_month?: string
          p_user_id: string
        }
        Returns: {
          balance: number
          expenses: number
          income: number
          month: string
          sent_to_invest: number
        }[]
      }
      get_opening_balances: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_user_id: string
        }
        Returns: {
          month: string
          opening_balance: number
        }[]
      }
      get_period_series: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_granularity?: string
          p_user_id: string
        }
        Returns: {
          balance: number
          expenses: number
          income: number
          period: string
          sent_to_invest: number
        }[]
      }
      get_popular_corrections: {
        Args: { _min_users?: number }
        Returns: {
          category: string
          movement: string
          pattern: string
          user_count: number
        }[]
      }
      get_top_expenses: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_end_date: string
          p_limit?: number
          p_start_date: string
          p_user_id: string
        }
        Returns: {
          amount: number
          category: string
          date: string
          description: string
          description_norm: string
          id: string
        }[]
      }
      get_weekday_spending: {
        Args: {
          p_domain: Database["public"]["Enums"]["app_domain"]
          p_user_id: string
        }
        Returns: {
          avg_spend: number
          total_spend: number
          tx_count: number
          weekday: number
        }[]
      }
      increment_rule_stats: {
        Args: { _hit_count: number; _rule_id: string }
        Returns: undefined
      }
      log_audit_event: {
        Args: {
          _action: string
          _diff?: Json
          _entity_id: string
          _entity_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_role: "CASH" | "INVESTMENT"
      app_domain: "CASHFLOW" | "INVESTING"
      import_status: "UPLOADED" | "PARSED" | "NORMALIZED" | "FAILED" | "PARTIAL"
      movement_type: "INCOME" | "EXPENSE" | "TRANSFER"
      period_status: "OPEN" | "READY_TO_CLOSE" | "CLOSED"
      source_type: "BANK" | "BROKER" | "SAVINGS" | "CARD" | "OTHER"
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
      account_role: ["CASH", "INVESTMENT"],
      app_domain: ["CASHFLOW", "INVESTING"],
      import_status: ["UPLOADED", "PARSED", "NORMALIZED", "FAILED", "PARTIAL"],
      movement_type: ["INCOME", "EXPENSE", "TRANSFER"],
      period_status: ["OPEN", "READY_TO_CLOSE", "CLOSED"],
      source_type: ["BANK", "BROKER", "SAVINGS", "CARD", "OTHER"],
    },
  },
} as const
