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
      attempts: {
        Row: {
          answers_json: Json | null
          completion_time_ms: number | null
          created_at: string | null
          end_time: string | null
          id: string
          is_winner: boolean | null
          quiz_id: string | null
          reward_claimed: boolean | null
          score: number | null
          session_id: string
          start_time: string
          status: string
          total_questions: number
          user_fid: number | null
          wallet_address: string
        }
        Insert: {
          answers_json?: Json | null
          completion_time_ms?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_winner?: boolean | null
          quiz_id?: string | null
          reward_claimed?: boolean | null
          score?: number | null
          session_id: string
          start_time: string
          status?: string
          total_questions: number
          user_fid?: number | null
          wallet_address: string
        }
        Update: {
          answers_json?: Json | null
          completion_time_ms?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_winner?: boolean | null
          quiz_id?: string | null
          reward_claimed?: boolean | null
          score?: number | null
          session_id?: string
          start_time?: string
          status?: string
          total_questions?: number
          user_fid?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_tokens: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          fid: number
          id: string
          token: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          fid: number
          id?: string
          token: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          fid?: number
          id?: string
          token?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          poll_id: string
          voter_address: string | null
          voter_fid: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          poll_id: string
          voter_address?: string | null
          voter_fid: number
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          poll_id?: string
          voter_address?: string | null
          voter_fid?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string | null
          creator_address: string | null
          creator_fid: number
          description: string | null
          ends_at: string | null
          id: string
          is_anonymous: boolean | null
          is_multiple_choice: boolean | null
          options: Json
          require_token: string | null
          require_token_amount: string | null
          title: string
          total_votes: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_address?: string | null
          creator_fid: number
          description?: string | null
          ends_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_multiple_choice?: boolean | null
          options?: Json
          require_token?: string | null
          require_token_amount?: string | null
          title: string
          total_votes?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_address?: string | null
          creator_fid?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_multiple_choice?: boolean | null
          options?: Json
          require_token?: string | null
          require_token_amount?: string | null
          title?: string
          total_votes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          contract_quiz_id: string | null
          created_at: string | null
          creator_fid: number | null
          creator_wallet: string
          current_winners: number | null
          deposit_tx_hash: string | null
          description: string | null
          end_time: string | null
          entry_fee: string | null
          entry_fee_token: string | null
          id: string
          nft_artwork_url: string | null
          nft_enabled: boolean | null
          questions_json: Json
          reward_amount: number
          reward_pools: Json | null
          reward_token: string
          stake_amount: number | null
          stake_token: string | null
          start_time: string | null
          status: string
          time_per_question: number
          title: string
          total_pool_amount: number | null
          updated_at: string | null
          use_custom_pools: boolean | null
          winner_limit: number
        }
        Insert: {
          contract_quiz_id?: string | null
          created_at?: string | null
          creator_fid?: number | null
          creator_wallet: string
          current_winners?: number | null
          deposit_tx_hash?: string | null
          description?: string | null
          end_time?: string | null
          entry_fee?: string | null
          entry_fee_token?: string | null
          id?: string
          nft_artwork_url?: string | null
          nft_enabled?: boolean | null
          questions_json: Json
          reward_amount: number
          reward_pools?: Json | null
          reward_token: string
          stake_amount?: number | null
          stake_token?: string | null
          start_time?: string | null
          status?: string
          time_per_question?: number
          title: string
          total_pool_amount?: number | null
          updated_at?: string | null
          use_custom_pools?: boolean | null
          winner_limit?: number
        }
        Update: {
          contract_quiz_id?: string | null
          created_at?: string | null
          creator_fid?: number | null
          creator_wallet?: string
          current_winners?: number | null
          deposit_tx_hash?: string | null
          description?: string | null
          end_time?: string | null
          entry_fee?: string | null
          entry_fee_token?: string | null
          id?: string
          nft_artwork_url?: string | null
          nft_enabled?: boolean | null
          questions_json?: Json
          reward_amount?: number
          reward_pools?: Json | null
          reward_token?: string
          stake_amount?: number | null
          stake_token?: string | null
          start_time?: string | null
          status?: string
          time_per_question?: number
          title?: string
          total_pool_amount?: number | null
          updated_at?: string | null
          use_custom_pools?: boolean | null
          winner_limit?: number
        }
        Relationships: []
      }
      reward_claims: {
        Row: {
          claim_tx_hash: string | null
          claimed_at: string | null
          created_at: string | null
          id: string
          pool_tier: number
          quiz_id: string
          rank: number
          rank_in_pool: number | null
          reward_amount: number
          status: string | null
          token_address: string
          tx_hash: string | null
          user_fid: number | null
          wallet_address: string
        }
        Insert: {
          claim_tx_hash?: string | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          pool_tier?: number
          quiz_id: string
          rank: number
          rank_in_pool?: number | null
          reward_amount: number
          status?: string | null
          token_address: string
          tx_hash?: string | null
          user_fid?: number | null
          wallet_address: string
        }
        Update: {
          claim_tx_hash?: string | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          pool_tier?: number
          quiz_id?: string
          rank?: number
          rank_in_pool?: number | null
          reward_amount?: number
          status?: string | null
          token_address?: string
          tx_hash?: string | null
          user_fid?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          claim_tx_hash: string | null
          claimed: boolean | null
          claimed_at: string | null
          completion_time_ms: number
          created_at: string | null
          id: string
          nft_token_id: string | null
          quiz_id: string | null
          rank: number
          reward_amount: number
          tx_hash: string | null
          user_fid: number | null
          username: string | null
          wallet_address: string
        }
        Insert: {
          claim_tx_hash?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          completion_time_ms: number
          created_at?: string | null
          id?: string
          nft_token_id?: string | null
          quiz_id?: string | null
          rank: number
          reward_amount: number
          tx_hash?: string | null
          user_fid?: number | null
          username?: string | null
          wallet_address: string
        }
        Update: {
          claim_tx_hash?: string | null
          claimed?: boolean | null
          claimed_at?: string | null
          completion_time_ms?: number
          created_at?: string | null
          id?: string
          nft_token_id?: string | null
          quiz_id?: string | null
          rank?: number
          reward_amount?: number
          tx_hash?: string | null
          user_fid?: number | null
          username?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "winners_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          id: string
          wallet_address: string | null
          fid: number | null
          role: string
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          wallet_address?: string | null
          fid?: number | null
          role?: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          wallet_address?: string | null
          fid?: number | null
          role?: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          id: string
          wallet_address: string
          reason: string | null
          banned_by: string
          banned_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          wallet_address: string
          reason?: string | null
          banned_by: string
          banned_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          wallet_address?: string
          reason?: string | null
          banned_by?: string
          banned_at?: string | null
          expires_at?: string | null
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
