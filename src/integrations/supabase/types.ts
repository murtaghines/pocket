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
          id: string
          institution: string | null
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
          id?: string
          institution?: string | null
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
          id?: string
          institution?: string | null
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
      categorization_rules: {
        Row: {
          category_id: string | null
          created_at: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          id: string
          match_field: string
          match_type: string
          pattern: string
          priority: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          domain: Database["public"]["Enums"]["app_domain"]
          id?: string
          match_field: string
          match_type: string
          pattern: string
          priority?: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          domain?: Database["public"]["Enums"]["app_domain"]
          id?: string
          match_field?: string
          match_type?: string
          pattern?: string
          priority?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_confirmations: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
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
          original_text: string | null
          platform: string
          transaction_hash: string | null
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
          original_text?: string | null
          platform: string
          transaction_hash?: string | null
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
          original_text?: string | null
          platform?: string
          transaction_hash?: string | null
          type?: string
          upload_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
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
          first_name: string | null
          id: string
          investment_platforms: string[] | null
          joint_account_names: string[] | null
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_category_rules?: Json | null
          first_name?: string | null
          id?: string
          investment_platforms?: string[] | null
          joint_account_names?: string[] | null
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_category_rules?: Json | null
          first_name?: string | null
          id?: string
          investment_platforms?: string[] | null
          joint_account_names?: string[] | null
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          amount_base: number | null
          auth_date: string | null
          auto_recategorized: boolean | null
          bank: string | null
          categorization_rule_id: string | null
          categorized_by: string | null
          category: string
          category_id: string | null
          category_source: string | null
          counterparty_raw: string | null
          created_at: string
          currency: string | null
          date: string
          description: string
          description_clean: string | null
          description_norm: string | null
          description_raw: string | null
          domain: Database["public"]["Enums"]["app_domain"] | null
          fingerprint: string | null
          fx_rate: number | null
          id: string
          import_id: string | null
          is_hidden: boolean
          linked_transaction_id: string | null
          merchant_norm: string | null
          movement: Database["public"]["Enums"]["movement_type"] | null
          original_text: string | null
          payment_channel: string | null
          period_id: string | null
          posted_date: string | null
          rule_id_applied: string | null
          running_balance: number | null
          source_row_hash: string | null
          source_transaction_id: string | null
          subcategory_id: string | null
          transaction_hash: string | null
          tx_type: string | null
          type: string
          upload_id: string | null
          user_corrected: boolean | null
          user_id: string
          value_date: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          amount_base?: number | null
          auth_date?: string | null
          auto_recategorized?: boolean | null
          bank?: string | null
          categorization_rule_id?: string | null
          categorized_by?: string | null
          category: string
          category_id?: string | null
          category_source?: string | null
          counterparty_raw?: string | null
          created_at?: string
          currency?: string | null
          date: string
          description: string
          description_clean?: string | null
          description_norm?: string | null
          description_raw?: string | null
          domain?: Database["public"]["Enums"]["app_domain"] | null
          fingerprint?: string | null
          fx_rate?: number | null
          id?: string
          import_id?: string | null
          is_hidden?: boolean
          linked_transaction_id?: string | null
          merchant_norm?: string | null
          movement?: Database["public"]["Enums"]["movement_type"] | null
          original_text?: string | null
          payment_channel?: string | null
          period_id?: string | null
          posted_date?: string | null
          rule_id_applied?: string | null
          running_balance?: number | null
          source_row_hash?: string | null
          source_transaction_id?: string | null
          subcategory_id?: string | null
          transaction_hash?: string | null
          tx_type?: string | null
          type: string
          upload_id?: string | null
          user_corrected?: boolean | null
          user_id: string
          value_date?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          amount_base?: number | null
          auth_date?: string | null
          auto_recategorized?: boolean | null
          bank?: string | null
          categorization_rule_id?: string | null
          categorized_by?: string | null
          category?: string
          category_id?: string | null
          category_source?: string | null
          counterparty_raw?: string | null
          created_at?: string
          currency?: string | null
          date?: string
          description?: string
          description_clean?: string | null
          description_norm?: string | null
          description_raw?: string | null
          domain?: Database["public"]["Enums"]["app_domain"] | null
          fingerprint?: string | null
          fx_rate?: number | null
          id?: string
          import_id?: string | null
          is_hidden?: boolean
          linked_transaction_id?: string | null
          merchant_norm?: string | null
          movement?: Database["public"]["Enums"]["movement_type"] | null
          original_text?: string | null
          payment_channel?: string | null
          period_id?: string | null
          posted_date?: string | null
          rule_id_applied?: string | null
          running_balance?: number | null
          source_row_hash?: string | null
          source_transaction_id?: string | null
          subcategory_id?: string | null
          transaction_hash?: string | null
          tx_type?: string | null
          type?: string
          upload_id?: string | null
          user_corrected?: boolean | null
          user_id?: string
          value_date?: string | null
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
            foreignKeyName: "transactions_categorization_rule_id_fkey"
            columns: ["categorization_rule_id"]
            isOneToOne: false
            referencedRelation: "categorization_rules"
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
            foreignKeyName: "transactions_linked_transaction_id_fkey"
            columns: ["linked_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
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
          investment_platforms: string[] | null
          joint_account_names: string[] | null
          joint_account_split: number
          language: string
          locale: string
          onboarding_completed: boolean | null
          selected_categories: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_currency?: string
          country?: string | null
          created_at?: string | null
          date_format?: string | null
          id?: string
          investment_platforms?: string[] | null
          joint_account_names?: string[] | null
          joint_account_split?: number
          language?: string
          locale?: string
          onboarding_completed?: boolean | null
          selected_categories?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_currency?: string
          country?: string | null
          created_at?: string | null
          date_format?: string | null
          id?: string
          investment_platforms?: string[] | null
          joint_account_names?: string[] | null
          joint_account_split?: number
          language?: string
          locale?: string
          onboarding_completed?: boolean | null
          selected_categories?: string[] | null
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
      [_ in never]: never
    }
    Enums: {
      account_role: "CASH" | "INVESTMENT"
      app_domain: "CASHFLOW" | "INVESTING"
      import_status: "UPLOADED" | "PARSED" | "NORMALIZED" | "FAILED"
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
      import_status: ["UPLOADED", "PARSED", "NORMALIZED", "FAILED"],
      movement_type: ["INCOME", "EXPENSE", "TRANSFER"],
      period_status: ["OPEN", "READY_TO_CLOSE", "CLOSED"],
      source_type: ["BANK", "BROKER", "SAVINGS", "CARD", "OTHER"],
    },
  },
} as const
