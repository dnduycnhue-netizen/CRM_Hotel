export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          code: string;
          name: string;
          address: string | null;
          phone: string | null;
          google_review_url: string | null;
          night_cutoff: string;
          default_checkout_time: string;
          idle_logout_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['branches']['Row']>;
        Update: Partial<Database['public']['Tables']['branches']['Row']>;
      };
      rooms: {
        Row: {
          id: string;
          branch_id: string;
          number: string;
          floor: number | null;
          room_type: string | null;
          opened_on: string | null;
          closed_on: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['rooms']['Row']>;
        Update: Partial<Database['public']['Tables']['rooms']['Row']>;
      };
      [key: string]: any;
    };
    Views: {
      [key: string]: any;
    };
    Functions: {
      my_access: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      [key: string]: any;
    };
    Enums: {
      [key: string]: any;
    };
    CompositeTypes: {
      [key: string]: any;
    };
  };
};
