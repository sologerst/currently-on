export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      diary_entries: {
        Row: {
          created_at: string;
          date_finished: string;
          id: string;
          item_id: string;
          kind: string;
          name: string;
          personal_rating: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          date_finished?: string;
          id?: string;
          item_id: string;
          kind: string;
          name: string;
          personal_rating?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          date_finished?: string;
          id?: string;
          item_id?: string;
          kind?: string;
          name?: string;
          personal_rating?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diary_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          read: boolean;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          read?: boolean;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          read?: boolean;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recommendation_comments: {
        Row: {
          created_at: string;
          id: string;
          recommendation_id: string;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          recommendation_id: string;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          recommendation_id?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_comments_recommendation_id_fkey";
            columns: ["recommendation_id"];
            isOneToOne: false;
            referencedRelation: "recommendations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recommendation_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          recommendation_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          id?: string;
          recommendation_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          id?: string;
          recommendation_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_reactions_recommendation_id_fkey";
            columns: ["recommendation_id"];
            isOneToOne: false;
            referencedRelation: "recommendations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_reactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      recommendations: {
        Row: {
          author_id: string;
          created_at: string;
          id: string;
          item_id: string;
          item_kind: string;
          item_name: string;
          note: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          item_id: string;
          item_kind: string;
          item_name: string;
          note?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          item_kind?: string;
          item_name?: string;
          note?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendations_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tracked_items: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          kind: string;
          my_rating: number;
          my_review: string;
          my_status: string;
          recommended_by: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          kind: string;
          my_rating?: number;
          my_review?: string;
          my_status: string;
          recommended_by?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          kind?: string;
          my_rating?: number;
          my_review?: string;
          my_status?: string;
          recommended_by?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracked_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
