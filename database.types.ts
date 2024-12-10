export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analysis: {
        Row: {
          additional_data: Json | null
          created_at: string
          extracted_events: Json | null
          id: number
          num_avail_beds: number | null
          num_total_beds: number | null
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string
          extracted_events?: Json | null
          id?: number
          num_avail_beds?: number | null
          num_total_beds?: number | null
        }
        Update: {
          additional_data?: Json | null
          created_at?: string
          extracted_events?: Json | null
          id?: number
          num_avail_beds?: number | null
          num_total_beds?: number | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          created_at: string
          fk_analysis: number | null
          fk_transcription_bot: number | null
          fk_transcription_cbo: number | null
          fk_transcription_full: number | null
          id: number
          room_url: string | null
          s3_folder_dir: string | null
        }
        Insert: {
          created_at?: string
          fk_analysis?: number | null
          fk_transcription_bot?: number | null
          fk_transcription_cbo?: number | null
          fk_transcription_full?: number | null
          id?: number
          room_url?: string | null
          s3_folder_dir?: string | null
        }
        Update: {
          created_at?: string
          fk_analysis?: number | null
          fk_transcription_bot?: number | null
          fk_transcription_cbo?: number | null
          fk_transcription_full?: number | null
          id?: number
          room_url?: string | null
          s3_folder_dir?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_fk_analysis_fkey"
            columns: ["fk_analysis"]
            isOneToOne: false
            referencedRelation: "analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_fk_transcription_bot_fkey"
            columns: ["fk_transcription_bot"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_fk_transcription_cbo_fkey"
            columns: ["fk_transcription_cbo"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_fk_transcription_full_fkey"
            columns: ["fk_transcription_full"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_desc: string | null
          event_end: string | null
          event_start: string | null
          event_title: string | null
          fk_call: number | null
          id: number
          isAllDay: boolean | null
          isRecurring: boolean | null
        }
        Insert: {
          created_at?: string
          event_desc?: string | null
          event_end?: string | null
          event_start?: string | null
          event_title?: string | null
          fk_call?: number | null
          id?: number
          isAllDay?: boolean | null
          isRecurring?: boolean | null
        }
        Update: {
          created_at?: string
          event_desc?: string | null
          event_end?: string | null
          event_start?: string | null
          event_title?: string | null
          fk_call?: number | null
          id?: number
          isAllDay?: boolean | null
          isRecurring?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "events_fk_call_fkey"
            columns: ["fk_call"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          call_type: string | null
          created_at: string
          duration: number | null
          full_transcript: string | null
          id: number
          individual_words: Json | null
        }
        Insert: {
          call_type?: string | null
          created_at?: string
          duration?: number | null
          full_transcript?: string | null
          id?: number
          individual_words?: Json | null
        }
        Update: {
          call_type?: string | null
          created_at?: string
          duration?: number | null
          full_transcript?: string | null
          id?: number
          individual_words?: Json | null
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
