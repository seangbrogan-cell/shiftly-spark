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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_availability: {
        Row: {
          created_at: string
          day_of_week: string
          employee_id: string
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          employee_id: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          employee_id?: string
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_workplaces: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          workplace_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          workplace_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          workplace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_workplaces_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_workplaces_workplace_id_fkey"
            columns: ["workplace_id"]
            isOneToOne: false
            referencedRelation: "workplaces"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          availability: string[]
          created_at: string
          email: string
          employer_id: string
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          availability?: string[]
          created_at?: string
          email: string
          employer_id: string
          id?: string
          name: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          availability?: string[]
          created_at?: string
          email?: string
          employer_id?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          created_at: string
          id: string
          name: string
          schedule_updated_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          schedule_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          schedule_updated_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_config: {
        Row: {
          channels: string[]
          created_at: string
          daily_reminder: boolean
          employer_id: string
          id: string
          on_change: boolean
          on_publish: boolean
          updated_at: string
          weekly_reminder: boolean
        }
        Insert: {
          channels?: string[]
          created_at?: string
          daily_reminder?: boolean
          employer_id: string
          id?: string
          on_change?: boolean
          on_publish?: boolean
          updated_at?: string
          weekly_reminder?: boolean
        }
        Update: {
          channels?: string[]
          created_at?: string
          daily_reminder?: boolean
          employer_id?: string
          id?: string
          on_change?: boolean
          on_publish?: boolean
          updated_at?: string
          weekly_reminder?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_config_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: true
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          employee_id: string
          employer_id: string
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_id: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_id?: string
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          employer_id: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          employer_id?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          employer_id?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_history: {
        Row: {
          action: string
          created_at: string
          employee_count: number
          employer_id: string
          end_date: string
          id: string
          notification_channels: string[]
          published_at: string
          start_date: string
        }
        Insert: {
          action?: string
          created_at?: string
          employee_count?: number
          employer_id: string
          end_date: string
          id?: string
          notification_channels?: string[]
          published_at?: string
          start_date: string
        }
        Update: {
          action?: string
          created_at?: string
          employee_count?: number
          employer_id?: string
          end_date?: string
          id?: string
          notification_channels?: string[]
          published_at?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_history_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      role_types: {
        Row: {
          created_at: string
          employer_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          employer_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          employer_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_types_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          assigned_date: string
          conflict_resolved: boolean
          created_at: string
          employee_id: string
          employer_id: string
          id: string
          published_at: string | null
          shift_id: string
          updated_at: string
          workplace_id: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_date?: string
          conflict_resolved?: boolean
          created_at?: string
          employee_id: string
          employer_id: string
          id?: string
          published_at?: string | null
          shift_id: string
          updated_at?: string
          workplace_id?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          assigned_date?: string
          conflict_resolved?: boolean
          created_at?: string
          employee_id?: string
          employer_id?: string
          id?: string
          published_at?: string | null
          shift_id?: string
          updated_at?: string
          workplace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_workplace_id_fkey"
            columns: ["workplace_id"]
            isOneToOne: false
            referencedRelation: "workplaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          color: string | null
          created_at: string
          employer_id: string
          end_time: string | null
          id: string
          is_all_day: boolean
          name: string
          notes: string | null
          start_time: string | null
          workplace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          employer_id: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          name: string
          notes?: string | null
          start_time?: string | null
          workplace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          employer_id?: string
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          name?: string
          notes?: string | null
          start_time?: string | null
          workplace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_workplace_id_fkey"
            columns: ["workplace_id"]
            isOneToOne: false
            referencedRelation: "workplaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      time_off_requests: {
        Row: {
          created_at: string
          employee_id: string
          employer_id: string
          end_date: string
          id: string
          notes: string | null
          reason: string
          start_date: string
          status: string
          suggested_replacement_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_id: string
          end_date: string
          id?: string
          notes?: string | null
          reason: string
          start_date: string
          status?: string
          suggested_replacement_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          reason?: string
          start_date?: string
          status?: string
          suggested_replacement_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_suggested_replacement_id_fkey"
            columns: ["suggested_replacement_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      workplaces: {
        Row: {
          created_at: string
          employer_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplaces_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_shift_conflict: {
        Args: {
          _actual_end: string
          _actual_start: string
          _assigned_date: string
          _employee_id: string
          _exclude_assignment_id?: string
        }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_employer_id: { Args: { _user_id: string }; Returns: string }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
