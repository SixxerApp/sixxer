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
      clubs: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          primary_color: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          primary_color?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          primary_color?: string
        }
        Relationships: []
      }
      event_responses: {
        Row: {
          event_id: string
          id: string
          responded_at: string
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          responded_at?: string
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          responded_at?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          home_away: Database["public"]["Enums"]["home_away"] | null
          id: string
          location: string | null
          location_url: string | null
          meetup_at: string | null
          opponent: string | null
          starts_at: string
          team_id: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          home_away?: Database["public"]["Enums"]["home_away"] | null
          id?: string
          location?: string | null
          location_url?: string | null
          meetup_at?: string | null
          opponent?: string | null
          starts_at: string
          team_id: string
          title: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          home_away?: Database["public"]["Enums"]["home_away"] | null
          id?: string
          location?: string | null
          location_url?: string | null
          meetup_at?: string | null
          opponent?: string | null
          starts_at?: string
          team_id?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          club_id: string
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          team_id: string | null
        }
        Insert: {
          club_id: string
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          team_id?: string | null
        }
        Update: {
          club_id?: string
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_assignments: {
        Row: {
          confirmed_at: string | null
          id: string
          marked_paid_at: string | null
          note: string | null
          request_id: string
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          id?: string
          marked_paid_at?: string | null
          note?: string | null
          request_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          id?: string
          marked_paid_at?: string | null
          note?: string | null
          request_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string
          currency: string
          description: string | null
          due_at: string | null
          event_id: string | null
          id: string
          team_id: string
          title: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          team_id: string
          title: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          image_url: string | null
          team_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          team_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          banner_color: string
          club_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          banner_color?: string
          club_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          banner_color?: string
          club_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          club_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      event_team_id: { Args: { _event_id: string }; Returns: string }
      has_role: {
        Args: {
          _club_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      payment_request_team_id: { Args: { _req_id: string }; Returns: string }
      team_club_id: { Args: { _team_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "player"
      event_type: "match" | "event"
      home_away: "home" | "away"
      payment_status: "unpaid" | "marked_paid" | "confirmed" | "rejected"
      rsvp_status: "going" | "maybe" | "declined"
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
      app_role: ["admin", "player"],
      event_type: ["match", "event"],
      home_away: ["home", "away"],
      payment_status: ["unpaid", "marked_paid", "confirmed", "rejected"],
      rsvp_status: ["going", "maybe", "declined"],
    },
  },
} as const
