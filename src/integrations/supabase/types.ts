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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string
          emails_sent: number
          id: string
          last_run_at: string | null
          name: string
          prompt_json: Json | null
          sequence: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emails_sent?: number
          id?: string
          last_run_at?: string | null
          name: string
          prompt_json?: Json | null
          sequence?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emails_sent?: number
          id?: string
          last_run_at?: string | null
          name?: string
          prompt_json?: Json | null
          sequence?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_info: {
        Row: {
          company_name: string | null
          context_json: Json | null
          created_at: string
          description: string | null
          id: string
          key_benefits: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
          value_proposition: string | null
        }
        Insert: {
          company_name?: string | null
          context_json?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          key_benefits?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
          value_proposition?: string | null
        }
        Update: {
          company_name?: string | null
          context_json?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          key_benefits?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
          value_proposition?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string
          campaign_id: string | null
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          opened_at: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          subject: string
          to_email: string
          user_id: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject: string
          to_email: string
          user_id: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          opened_at?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          subject?: string
          to_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_replies: {
        Row: {
          body: string
          created_at: string
          from_email: string
          from_name: string | null
          id: string
          is_read: boolean
          is_starred: boolean
          lead_id: string | null
          original_email_id: string | null
          received_at: string
          sentiment: string | null
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_email: string
          from_name?: string | null
          id?: string
          is_read?: boolean
          is_starred?: boolean
          lead_id?: string | null
          original_email_id?: string | null
          received_at?: string
          sentiment?: string | null
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_email?: string
          from_name?: string | null
          id?: string
          is_read?: boolean
          is_starred?: boolean
          lead_id?: string | null
          original_email_id?: string | null
          received_at?: string
          sentiment?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_replies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_original_email_id_fkey"
            columns: ["original_email_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component: string
          created_at: string | null
          error_details: Json | null
          error_message: string
          id: string
          stack_trace: string | null
          user_id: string
        }
        Insert: {
          component: string
          created_at?: string | null
          error_details?: Json | null
          error_message: string
          id?: string
          stack_trace?: string | null
          user_id: string
        }
        Update: {
          component?: string
          created_at?: string | null
          error_details?: Json | null
          error_message?: string
          id?: string
          stack_trace?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string | null
          founder_linkedin: string | null
          id: string
          name: string
          persona_generated_at: string | null
          persona_insights: Json | null
          position: string
          requirement: string
          status: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email?: string | null
          founder_linkedin?: string | null
          id?: string
          name: string
          persona_generated_at?: string | null
          persona_insights?: Json | null
          position: string
          requirement: string
          status?: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string | null
          founder_linkedin?: string | null
          id?: string
          name?: string
          persona_generated_at?: string | null
          persona_insights?: Json | null
          position?: string
          requirement?: string
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          lead_id: string | null
          meeting_link: string | null
          meeting_type: string
          notes: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          lead_id?: string | null
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          lead_id?: string | null
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          prompt_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          prompt_config: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          prompt_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_settings: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          host: string
          id: string
          is_verified: boolean
          password: string
          port: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name: string
          host: string
          id?: string
          is_verified?: boolean
          password: string
          port?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          is_verified?: boolean
          password?: string
          port?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      warmup_settings: {
        Row: {
          created_at: string
          current_daily_limit: number
          enabled: boolean
          id: string
          max_daily_limit: number
          ramp_up_rate: number
          send_window_end: number
          send_window_start: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_daily_limit?: number
          enabled?: boolean
          id?: string
          max_daily_limit?: number
          ramp_up_rate?: number
          send_window_end?: number
          send_window_start?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_daily_limit?: number
          enabled?: boolean
          id?: string
          max_daily_limit?: number
          ramp_up_rate?: number
          send_window_end?: number
          send_window_start?: number
          timezone?: string
          updated_at?: string
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
