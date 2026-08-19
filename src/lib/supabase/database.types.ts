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
          link: string | null;
          read: boolean;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          link?: string | null;
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
          avatar_path: string | null;
          bio: string;
          created_at: string;
          display_name: string;
          handle: string | null;
          id: string;
          invite_code: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          avatar_path?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          handle?: string | null;
          id: string;
          invite_code?: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          avatar_path?: string | null;
          bio?: string;
          created_at?: string;
          display_name?: string;
          handle?: string | null;
          id?: string;
          invite_code?: string;
          updated_at?: string;
          visibility?: string;
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
          item_image_url: string | null;
          item_kind: string;
          item_name: string;
          note: string;
          pinned: boolean;
          visibility: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          item_id: string;
          item_image_url?: string | null;
          item_kind: string;
          item_name: string;
          note?: string;
          pinned?: boolean;
          visibility?: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          id?: string;
          item_id?: string;
          item_image_url?: string | null;
          item_kind?: string;
          item_name?: string;
          note?: string;
          pinned?: boolean;
          visibility?: string;
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
          image_url: string | null;
          item_id: string;
          item_name: string;
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
          image_url?: string | null;
          item_id: string;
          item_name?: string;
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
          image_url?: string | null;
          item_id?: string;
          item_name?: string;
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
      follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          addressee_id: string;
          created_at?: string;
          id?: string;
          requester_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey";
            columns: ["addressee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "friendships_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          kind: string;
          owner_id: string;
          slug: string;
          title: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          kind?: string;
          owner_id: string;
          slug: string;
          title: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          kind?: string;
          owner_id?: string;
          slug?: string;
          title?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lists_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      list_items: {
        Row: {
          created_at: string;
          id: string;
          image_url: string | null;
          item_id: string;
          item_kind: string;
          item_name: string;
          list_id: string;
          note: string;
          position: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          item_id: string;
          item_kind: string;
          item_name: string;
          list_id: string;
          note?: string;
          position?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string | null;
          item_id?: string;
          item_kind?: string;
          item_name?: string;
          list_id?: string;
          note?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      recommendation_recipients: {
        Row: {
          created_at: string;
          recommendation_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          recommendation_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          recommendation_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_recipients_recommendation_id_fkey";
            columns: ["recommendation_id"];
            isOneToOne: false;
            referencedRelation: "recommendations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_recipients_user_id_fkey";
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
      are_friends: { Args: { a: string; b: string }; Returns: boolean };
      can_view_profile: { Args: { owner_id: string }; Returns: boolean };
      ensure_standard_lists: { Args: { p_user_id: string }; Returns: undefined };
      find_profile_by_email: {
        Args: { p_email: string };
        Returns: {
          avatar_path: string | null;
          bio: string;
          display_name: string;
          handle: string | null;
          id: string;
          visibility: string;
        }[];
      };
      lookup_invite: {
        Args: { code: string };
        Returns: {
          avatar_path: string | null;
          bio: string;
          display_name: string;
          handle: string | null;
          id: string;
          visibility: string;
        }[];
      };
      my_feed_ids: { Args: Record<PropertyKey, never>; Returns: { id: string }[] };
      normalize_handle: { Args: { raw: string }; Returns: string };
      redeem_invite: { Args: { code: string }; Returns: string };
      request_friend: {
        Args: { target_id: string };
        Returns: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          status: string;
          updated_at: string;
        };
      };
      respond_friend: {
        Args: { accept: boolean; other_id: string };
        Returns: undefined;
      };
      search_people: {
        Args: { q: string };
        Returns: {
          avatar_path: string | null;
          bio: string;
          display_name: string;
          handle: string | null;
          id: string;
          visibility: string;
        }[];
      };
      unfriend: { Args: { other_id: string }; Returns: undefined };
      unique_handle: { Args: { desired: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
