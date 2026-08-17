export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string;
          description: string;
          icon: string;
          id: string;
          min_xp: number;
          name: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          icon?: string;
          id?: string;
          min_xp?: number;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          min_xp?: number;
          name?: string;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          category: string;
          content: string;
          created_at: string;
          id: string;
          image_key: string | null;
          order_index: number;
          summary: string;
          tips: string[];
          title: string;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string;
          id?: string;
          image_key?: string | null;
          order_index?: number;
          summary: string;
          tips?: string[];
          title: string;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string;
          id?: string;
          image_key?: string | null;
          order_index?: number;
          summary?: string;
          tips?: string[];
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          class_name: string | null;
          created_at: string;
          full_name: string;
          id: string;
          school: string | null;
          xp: number;
        };
        Insert: {
          class_name?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          school?: string | null;
          xp?: number;
        };
        Update: {
          class_name?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          school?: string | null;
          xp?: number;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          score: number;
          total: number;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          score: number;
          total: number;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          score?: number;
          total?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          category: string;
          correct_index: number;
          created_at: string;
          explanation: string;
          id: string;
          options: string[];
          question: string;
        };
        Insert: {
          category?: string;
          correct_index?: number;
          created_at?: string;
          explanation?: string;
          id?: string;
          options: string[];
          question: string;
        };
        Update: {
          category?: string;
          correct_index?: number;
          created_at?: string;
          explanation?: string;
          id?: string;
          options?: string[];
          question?: string;
        };
        Relationships: [];
      };
      survey_responses: {
        Row: {
          answers: Json;
          awareness_score: number;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          answers: Json;
          awareness_score?: number;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          answers?: Json;
          awareness_score?: number;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      traffic_signs: {
        Row: {
          category: string;
          created_at: string;
          glyph: string;
          id: string;
          meaning: string;
          name: string;
          usage_note: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          glyph?: string;
          id?: string;
          meaning: string;
          name: string;
          usage_note: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          glyph?: string;
          id?: string;
          meaning?: string;
          name?: string;
          usage_note?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: string;
          earned_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          badge_id: string;
          earned_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          badge_id?: string;
          earned_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "student" | "teacher";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "teacher"],
    },
  },
} as const;
