/**
 * AUTO-GENERATED from Supabase project uecphpjymbgtttrizhgy (bookglow).
 * Prefer regenerating via MCP generate_typescript_types or:
 *   $env:SUPABASE_PROJECT_ID="uecphpjymbgtttrizhgy"; npm run supabase:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      outlets: {
        Row: {
          address: Json | null;
          address_display: string | null;
          booking_slug: string | null;
          business_hours: Json | null;
          created_at: string | null;
          email: string | null;
          is_active: boolean | null;
          name: string;
          outlet_id: string;
          phone: string | null;
          phone_number: string | null;
          reviews: Json | null;
          service_categories: Json | null;
          settings: Json | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: Json | null;
          address_display?: string | null;
          booking_slug?: string | null;
          business_hours?: Json | null;
          created_at?: string | null;
          email?: string | null;
          is_active?: boolean | null;
          name: string;
          outlet_id: string;
          phone?: string | null;
          phone_number?: string | null;
          reviews?: Json | null;
          service_categories?: Json | null;
          settings?: Json | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: Json | null;
          address_display?: string | null;
          booking_slug?: string | null;
          business_hours?: Json | null;
          created_at?: string | null;
          email?: string | null;
          is_active?: boolean | null;
          name?: string;
          outlet_id?: string;
          phone?: string | null;
          phone_number?: string | null;
          reviews?: Json | null;
          service_categories?: Json | null;
          settings?: Json | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          category: string | null;
          category_id: string | null;
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          duration: number | null;
          icon_id: string | null;
          id: string;
          image_url: string | null;
          is_commissionable: boolean | null;
          is_promotion: boolean | null;
          is_visible: boolean | null;
          name: string;
          outlet_id: string;
          points: number | null;
          price: number | null;
          redeem_points: number | null;
          redeem_points_enabled: boolean | null;
        };
        Insert: {
          category?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          duration?: number | null;
          icon_id?: string | null;
          id: string;
          image_url?: string | null;
          is_commissionable?: boolean | null;
          is_promotion?: boolean | null;
          is_visible?: boolean | null;
          name?: string;
          outlet_id: string;
          points?: number | null;
          price?: number | null;
          redeem_points?: number | null;
          redeem_points_enabled?: boolean | null;
        };
        Update: {
          category?: string | null;
          category_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          duration?: number | null;
          icon_id?: string | null;
          id?: string;
          image_url?: string | null;
          is_commissionable?: boolean | null;
          is_promotion?: boolean | null;
          is_visible?: boolean | null;
          name?: string;
          outlet_id?: string;
          points?: number | null;
          price?: number | null;
          redeem_points?: number | null;
          redeem_points_enabled?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "services_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["outlet_id"];
          },
        ];
      };
      staff: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          name: string;
          outlet_id: string;
          phone: string | null;
          photo_url: string | null;
          profile_picture: string | null;
          qualified_services: Json | null;
          role: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id: string;
          name?: string;
          outlet_id: string;
          phone?: string | null;
          photo_url?: string | null;
          profile_picture?: string | null;
          qualified_services?: Json | null;
          role?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          outlet_id?: string;
          phone?: string | null;
          photo_url?: string | null;
          profile_picture?: string | null;
          qualified_services?: Json | null;
          role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["outlet_id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          outlet_id: string;
          client_id: string | null;
          customer_id: string | null;
          staff_id: string | null;
          service_id: string | null;
          date: string;
          time: string;
          end_time: string | null;
          status: string | null;
          reminder_sent: boolean | null;
          is_on_duty: boolean | null;
          source_sale_id: string | null;
          sale_id: string | null;
          source: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          outlet_id: string;
          client_id?: string | null;
          customer_id?: string | null;
          staff_id?: string | null;
          service_id?: string | null;
          date: string;
          time: string;
          end_time?: string | null;
          status?: string | null;
          reminder_sent?: boolean | null;
          is_on_duty?: boolean | null;
          source_sale_id?: string | null;
          sale_id?: string | null;
          source?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          client_id?: string | null;
          customer_id?: string | null;
          staff_id?: string | null;
          service_id?: string | null;
          date?: string;
          time?: string;
          end_time?: string | null;
          status?: string | null;
          reminder_sent?: boolean | null;
          is_on_duty?: boolean | null;
          source_sale_id?: string | null;
          sale_id?: string | null;
          source?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["outlet_id"];
          },
        ];
      };
      clients: {
        Row: {
          id: string;
          outlet_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
          points: number | null;
          voucher_count: number | null;
          credit: number | null;
          outstanding: number | null;
          birthday: string | null;
          gender: string | null;
          source: string | null;
          ic: string | null;
          marital: string | null;
          tag: string | null;
          ethnic: string | null;
          member_tier: string | null;
          last_import_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          outlet_id: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          points?: number | null;
          voucher_count?: number | null;
          credit?: number | null;
          outstanding?: number | null;
          birthday?: string | null;
          gender?: string | null;
          source?: string | null;
          ic?: string | null;
          marital?: string | null;
          tag?: string | null;
          ethnic?: string | null;
          member_tier?: string | null;
          last_import_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          points?: number | null;
          voucher_count?: number | null;
          credit?: number | null;
          outstanding?: number | null;
          birthday?: string | null;
          gender?: string | null;
          source?: string | null;
          ic?: string | null;
          marital?: string | null;
          tag?: string | null;
          ethnic?: string | null;
          member_tier?: string | null;
          last_import_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["outlet_id"];
          },
        ];
      };
      frontend_customers: {
        Row: {
          id: string;
          outlet_id: string | null;
          name: string | null;
          phone: string | null;
          email: string | null;
          client_id: string | null;
          booking_history_refs: Json | null;
          last_appointment_id: string | null;
          last_booked_at: string | null;
          source: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          outlet_id?: string | null;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          client_id?: string | null;
          booking_history_refs?: Json | null;
          last_appointment_id?: string | null;
          last_booked_at?: string | null;
          source?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string | null;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          client_id?: string | null;
          booking_history_refs?: Json | null;
          last_appointment_id?: string | null;
          last_booked_at?: string | null;
          source?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "frontend_customers_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["outlet_id"];
          },
        ];
      };
      points_credits: {
        Row: {
          client_id: string;
          sale_id: string;
          points: number;
          credited_at: string | null;
        };
        Insert: {
          client_id: string;
          sale_id: string;
          points: number;
          credited_at?: string | null;
        };
        Update: {
          client_id?: string;
          sale_id?: string;
          points?: number;
          credited_at?: string | null;
        };
        Relationships: [];
      };
      point_transactions: {
        Row: {
          id: string;
          client_id: string;
          outlet_id: string;
          type: string;
          amount: number | null;
          previous_balance: number | null;
          new_balance: number | null;
          timestamp: string | null;
          is_manual: boolean | null;
          description: string | null;
        };
        Insert: {
          id: string;
          client_id: string;
          outlet_id: string;
          type: string;
          amount?: number | null;
          previous_balance?: number | null;
          new_balance?: number | null;
          timestamp?: string | null;
          is_manual?: boolean | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          outlet_id?: string;
          type?: string;
          amount?: number | null;
          previous_balance?: number | null;
          new_balance?: number | null;
          timestamp?: string | null;
          is_manual?: boolean | null;
          description?: string | null;
        };
        Relationships: [];
      };
      outstanding_transactions: {
        Row: {
          id: string;
          client_id: string;
          outlet_id: string;
          type: string;
          amount: number | null;
          previous_balance: number | null;
          new_balance: number | null;
          timestamp: string | null;
          is_manual: boolean | null;
          description: string | null;
        };
        Insert: {
          id: string;
          client_id: string;
          outlet_id: string;
          type: string;
          amount?: number | null;
          previous_balance?: number | null;
          new_balance?: number | null;
          timestamp?: string | null;
          is_manual?: boolean | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          outlet_id?: string;
          type?: string;
          amount?: number | null;
          previous_balance?: number | null;
          new_balance?: number | null;
          timestamp?: string | null;
          is_manual?: boolean | null;
          description?: string | null;
        };
        Relationships: [];
      };
      credit_history: {
        Row: {
          id: string;
          client_id: string;
          outlet_id: string | null;
          type: string;
          amount: number | null;
          new_balance: number | null;
          staff_remark: string | null;
          staff_name: string | null;
          timestamp: string | null;
          transaction_id: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          outlet_id?: string | null;
          type: string;
          amount?: number | null;
          new_balance?: number | null;
          staff_remark?: string | null;
          staff_name?: string | null;
          timestamp?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          outlet_id?: string | null;
          type?: string;
          amount?: number | null;
          new_balance?: number | null;
          staff_remark?: string | null;
          staff_name?: string | null;
          timestamp?: string | null;
          transaction_id?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          outlet_id: string;
          date: string;
          type: string;
          client_id: string | null;
          items: Json | null;
          amount: number | null;
          category: string | null;
          description: string | null;
          payment_method: string | null;
          parent_sale_id: string | null;
          status: string | null;
          voided: boolean | null;
          remarks: string | null;
          payment_status: string | null;
          outstanding: number | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          outlet_id: string;
          date?: string;
          type: string;
          client_id?: string | null;
          items?: Json | null;
          amount?: number | null;
          category?: string | null;
          description?: string | null;
          payment_method?: string | null;
          parent_sale_id?: string | null;
          status?: string | null;
          voided?: boolean | null;
          remarks?: string | null;
          payment_status?: string | null;
          outstanding?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          date?: string;
          type?: string;
          client_id?: string | null;
          items?: Json | null;
          amount?: number | null;
          category?: string | null;
          description?: string | null;
          payment_method?: string | null;
          parent_sale_id?: string | null;
          status?: string | null;
          voided?: boolean | null;
          remarks?: string | null;
          payment_status?: string | null;
          outstanding?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          outlet_id: string;
          name: string;
          price: number | null;
          stock: number | null;
          category: string | null;
          fixed_commission_amount: number | null;
        };
        Insert: {
          id: string;
          outlet_id: string;
          name?: string;
          price?: number | null;
          stock?: number | null;
          category?: string | null;
          fixed_commission_amount?: number | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          price?: number | null;
          stock?: number | null;
          category?: string | null;
          fixed_commission_amount?: number | null;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          id: string;
          outlet_id: string;
          name: string;
          price: number | null;
          points: number | null;
          category: string | null;
          services: Json | null;
          description: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          outlet_id: string;
          name?: string;
          price?: number | null;
          points?: number | null;
          category?: string | null;
          services?: Json | null;
          description?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          price?: number | null;
          points?: number | null;
          category?: string | null;
          services?: Json | null;
          description?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          outlet_id: string;
          name: string;
          cost: number | null;
          icon: string | null;
        };
        Insert: {
          id: string;
          outlet_id: string;
          name?: string;
          cost?: number | null;
          icon?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          cost?: number | null;
          icon?: string | null;
        };
        Relationships: [];
      };
      vouchers: {
        Row: {
          id: string;
          outlet_id: string;
          name: string;
          price: number | null;
          service_ids: Json | null;
          expiry_date: string | null;
          status: string;
          slug: string | null;
          redemption_id: string | null;
          secret_code: string | null;
          purchased_at: string | null;
          redeemed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          outlet_id: string;
          name?: string;
          price?: number | null;
          service_ids?: Json | null;
          expiry_date?: string | null;
          status?: string;
          slug?: string | null;
          redemption_id?: string | null;
          secret_code?: string | null;
          purchased_at?: string | null;
          redeemed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          price?: number | null;
          service_ids?: Json | null;
          expiry_date?: string | null;
          status?: string;
          slug?: string | null;
          redemption_id?: string | null;
          secret_code?: string | null;
          purchased_at?: string | null;
          redeemed_at?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      api_integrations: {
        Row: {
          outlet_id: string;
          api_key_hash: string | null;
          key_prefix: string | null;
          webhook_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          outlet_id: string;
          api_key_hash?: string | null;
          key_prefix?: string | null;
          webhook_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          outlet_id?: string;
          api_key_hash?: string | null;
          key_prefix?: string | null;
          webhook_url?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          uid: string;
          email: string | null;
          outlet_id: string | null;
          role: string | null;
          display_name: string | null;
          created_at: string | null;
        };
        Insert: {
          uid: string;
          email?: string | null;
          outlet_id?: string | null;
          role?: string | null;
          display_name?: string | null;
          created_at?: string | null;
        };
        Update: {
          uid?: string;
          email?: string | null;
          outlet_id?: string | null;
          role?: string | null;
          display_name?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["outlet_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_public_available_slots: {
        Args: {
          p_outlet_id: string;
          p_service_id: string;
          p_date: string;
          p_staff_id?: string | null;
        };
        Returns: string[];
      };
      create_public_booking: {
        Args: {
          p_outlet_id: string;
          p_service_id: string;
          p_date: string;
          p_time: string;
          p_customer_name: string;
          p_phone: string;
          p_email?: string | null;
          p_staff_id?: string | null;
          p_auth_uid?: string | null;
        };
        Returns: Json;
      };
      submit_public_review: {
        Args: {
          p_outlet_id: string;
          p_author?: string | null;
          p_text?: string | null;
          p_rating?: number;
        };
        Returns: Json;
      };
      upsert_frontend_customer_profile: {
        Args: {
          p_email?: string | null;
          p_name?: string | null;
        };
        Returns: Json;
      };
      merchant_credit_points_for_sale: {
        Args: {
          p_client_id: string;
          p_sale_id: string;
          p_points: number;
          p_outlet_id: string;
        };
        Returns: boolean;
      };
      merchant_adjust_client_points: {
        Args: {
          p_client_id: string;
          p_outlet_id: string;
          p_type: string;
          p_amount: number;
          p_is_manual?: boolean | null;
          p_description?: string | null;
        };
        Returns: string;
      };
      merchant_adjust_client_outstanding: {
        Args: {
          p_client_id: string;
          p_outlet_id: string;
          p_type: string;
          p_amount: number;
          p_timestamp?: string | null;
        };
        Returns: string;
      };
      merchant_adjust_client_credit: {
        Args: {
          p_client_id: string;
          p_outlet_id: string;
          p_type: string;
          p_amount: number;
          p_staff_remark?: string | null;
          p_staff_name?: string | null;
          p_transaction_id?: string | null;
        };
        Returns: number;
      };
      public_voucher_purchase: {
        Args: { p_voucher_id: string };
        Returns: Json;
      };
      public_voucher_confirm_redemption: {
        Args: { p_voucher_id: string };
        Returns: undefined;
      };
      parse_time_to_minutes: {
        Args: { time_str: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
