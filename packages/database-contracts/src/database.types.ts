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
      api_integrations: {
        Row: {
          api_key_hash: string | null
          key_prefix: string | null
          outlet_id: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_hash?: string | null
          key_prefix?: string | null
          outlet_id: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_hash?: string | null
          key_prefix?: string | null
          outlet_id?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_integrations_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancelled_at: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          date: string
          end_time: string | null
          id: string
          is_on_duty: boolean | null
          outlet_id: string
          payment_status: string | null
          reminder_sent: boolean | null
          sale_id: string | null
          service_id: string | null
          source: string | null
          source_sale_id: string | null
          staff_id: string | null
          status: string | null
          time: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          date: string
          end_time?: string | null
          id: string
          is_on_duty?: boolean | null
          outlet_id: string
          payment_status?: string | null
          reminder_sent?: boolean | null
          sale_id?: string | null
          service_id?: string | null
          source?: string | null
          source_sale_id?: string | null
          staff_id?: string | null
          status?: string | null
          time: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          date?: string
          end_time?: string | null
          id?: string
          is_on_duty?: boolean | null
          outlet_id?: string
          payment_status?: string | null
          reminder_sent?: boolean | null
          sale_id?: string | null
          service_id?: string | null
          source?: string | null
          source_sale_id?: string | null
          staff_id?: string | null
          status?: string | null
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          outlet_id: string | null
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          outlet_id?: string | null
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          outlet_id?: string | null
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      billing_customers: {
        Row: {
          created_at: string
          email: string | null
          hitpay_customer_id: string | null
          outlet_id: string
          provider: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          hitpay_customer_id?: string | null
          outlet_id: string
          provider?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          hitpay_customer_id?: string | null
          outlet_id?: string
          provider?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      billing_events: {
        Row: {
          event_type: string
          id: string
          livemode: boolean
          outlet_id: string | null
          payload: Json
          provider: string
          received_at: string
          stripe_created_at: string | null
        }
        Insert: {
          event_type: string
          id: string
          livemode?: boolean
          outlet_id?: string | null
          payload: Json
          provider?: string
          received_at?: string
          stripe_created_at?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          livemode?: boolean
          outlet_id?: string | null
          payload?: Json
          provider?: string
          received_at?: string
          stripe_created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      clients: {
        Row: {
          birthday: string | null
          created_at: string | null
          credit: number | null
          email: string | null
          ethnic: string | null
          gender: string | null
          ic: string | null
          id: string
          last_import_id: string | null
          last_renewal_amount: number | null
          last_renewed_at: string | null
          marital: string | null
          marketing_email_consent: boolean
          marketing_sms_consent: boolean
          marketing_unsubscribed_at: string | null
          marketing_whatsapp_consent: boolean
          member_tier: string | null
          name: string
          notes: string | null
          outlet_id: string
          outstanding: number | null
          phone: string | null
          points: number | null
          source: string | null
          tag: string | null
          voucher_count: number | null
        }
        Insert: {
          birthday?: string | null
          created_at?: string | null
          credit?: number | null
          email?: string | null
          ethnic?: string | null
          gender?: string | null
          ic?: string | null
          id: string
          last_import_id?: string | null
          last_renewal_amount?: number | null
          last_renewed_at?: string | null
          marital?: string | null
          marketing_email_consent?: boolean
          marketing_sms_consent?: boolean
          marketing_unsubscribed_at?: string | null
          marketing_whatsapp_consent?: boolean
          member_tier?: string | null
          name?: string
          notes?: string | null
          outlet_id: string
          outstanding?: number | null
          phone?: string | null
          points?: number | null
          source?: string | null
          tag?: string | null
          voucher_count?: number | null
        }
        Update: {
          birthday?: string | null
          created_at?: string | null
          credit?: number | null
          email?: string | null
          ethnic?: string | null
          gender?: string | null
          ic?: string | null
          id?: string
          last_import_id?: string | null
          last_renewal_amount?: number | null
          last_renewed_at?: string | null
          marital?: string | null
          marketing_email_consent?: boolean
          marketing_sms_consent?: boolean
          marketing_unsubscribed_at?: string | null
          marketing_whatsapp_consent?: boolean
          member_tier?: string | null
          name?: string
          notes?: string | null
          outlet_id?: string
          outstanding?: number | null
          phone?: string | null
          points?: number | null
          source?: string | null
          tag?: string | null
          voucher_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      credit_history: {
        Row: {
          amount: number | null
          client_id: string
          id: string
          new_balance: number | null
          outlet_id: string | null
          staff_name: string | null
          staff_remark: string | null
          timestamp: string | null
          transaction_id: string | null
          type: string
        }
        Insert: {
          amount?: number | null
          client_id: string
          id?: string
          new_balance?: number | null
          outlet_id?: string | null
          staff_name?: string | null
          staff_remark?: string | null
          timestamp?: string | null
          transaction_id?: string | null
          type: string
        }
        Update: {
          amount?: number | null
          client_id?: string
          id?: string
          new_balance?: number | null
          outlet_id?: string | null
          staff_name?: string | null
          staff_remark?: string | null
          timestamp?: string | null
          transaction_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_history_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      frontend_customers: {
        Row: {
          booking_history_refs: Json | null
          client_id: string | null
          created_at: string | null
          email: string | null
          id: string
          last_appointment_id: string | null
          last_booked_at: string | null
          name: string | null
          outlet_id: string | null
          phone: string | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          booking_history_refs?: Json | null
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          last_appointment_id?: string | null
          last_booked_at?: string | null
          name?: string | null
          outlet_id?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_history_refs?: Json | null
          client_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_appointment_id?: string | null
          last_booked_at?: string | null
          name?: string | null
          outlet_id?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frontend_customers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      google_api_rate_limits: {
        Row: {
          bucket: string
          request_count: number
          window_started_at: string
        }
        Insert: {
          bucket: string
          request_count?: number
          window_started_at?: string
        }
        Update: {
          bucket?: string
          request_count?: number
          window_started_at?: string
        }
        Relationships: []
      }
      google_business_connections: {
        Row: {
          access_token_encrypted: string | null
          access_token_expires_at: string | null
          average_rating: number | null
          connected_by: string | null
          connected_email: string | null
          connection_provider: string | null
          created_at: string
          google_account_name: string | null
          google_location_name: string | null
          google_place_id: string | null
          granted_scope: string | null
          last_error_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_synced_at: string | null
          location_address: string | null
          location_title: string | null
          maps_uri: string | null
          outlet_id: string
          refresh_token_encrypted: string | null
          show_on_booking_page: boolean
          status: string
          total_review_count: number | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          access_token_expires_at?: string | null
          average_rating?: number | null
          connected_by?: string | null
          connected_email?: string | null
          connection_provider?: string | null
          created_at?: string
          google_account_name?: string | null
          google_location_name?: string | null
          google_place_id?: string | null
          granted_scope?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_synced_at?: string | null
          location_address?: string | null
          location_title?: string | null
          maps_uri?: string | null
          outlet_id: string
          refresh_token_encrypted?: string | null
          show_on_booking_page?: boolean
          status?: string
          total_review_count?: number | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          access_token_expires_at?: string | null
          average_rating?: number | null
          connected_by?: string | null
          connected_email?: string | null
          connection_provider?: string | null
          created_at?: string
          google_account_name?: string | null
          google_location_name?: string | null
          google_place_id?: string | null
          granted_scope?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_synced_at?: string | null
          location_address?: string | null
          location_title?: string | null
          maps_uri?: string | null
          outlet_id?: string
          refresh_token_encrypted?: string | null
          show_on_booking_page?: boolean
          status?: string
          total_review_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_business_connections_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      google_oauth_states: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          outlet_id: string
          return_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          outlet_id: string
          return_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          outlet_id?: string
          return_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_oauth_states_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      google_review_cursors: {
        Row: {
          created_at: string
          cursor_id: string
          expires_at: string
          order_by: string
          outlet_id: string
          page_token: string
        }
        Insert: {
          created_at?: string
          cursor_id: string
          expires_at: string
          order_by: string
          outlet_id: string
          page_token: string
        }
        Update: {
          created_at?: string
          cursor_id?: string
          expires_at?: string
          order_by?: string
          outlet_id?: string
          page_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_review_cursors_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      google_review_page_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          order_by: string
          outlet_id: string
          page_key: string
          payload: Json
        }
        Insert: {
          expires_at: string
          fetched_at?: string
          order_by: string
          outlet_id: string
          page_key: string
          payload: Json
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          order_by?: string
          outlet_id?: string
          page_key?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "google_review_page_cache_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      marketing_audiences: {
        Row: {
          created_at: string
          created_by: string | null
          criteria: Json
          description: string | null
          id: string
          name: string
          outlet_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          name: string
          outlet_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criteria?: Json
          description?: string | null
          id?: string
          name?: string
          outlet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_audiences_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      marketing_campaign_deliveries: {
        Row: {
          attempt_count: number
          campaign_id: string
          channel: string
          client_id: string
          id: string
          last_error: string | null
          outlet_id: string
          processed_at: string | null
          provider: string | null
          provider_message_id: string | null
          queued_at: string
          recipient_masked: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          campaign_id: string
          channel: string
          client_id: string
          id?: string
          last_error?: string | null
          outlet_id: string
          processed_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          queued_at?: string
          recipient_masked?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          campaign_id?: string
          channel?: string
          client_id?: string
          id?: string
          last_error?: string | null
          outlet_id?: string
          processed_at?: string | null
          provider?: string | null
          provider_message_id?: string | null
          queued_at?: string
          recipient_masked?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_deliveries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_deliveries_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          name: string
          objective: string
          offer: Json
          outlet_id: string
          scheduled_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          audience_id?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          name: string
          objective?: string
          offer?: Json
          outlet_id: string
          scheduled_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          audience_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          name?: string
          objective?: string
          offer?: Json
          outlet_id?: string
          scheduled_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "marketing_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      merchant_onboarding_drafts: {
        Row: {
          account_type: string | null
          auth_user_id: string
          completed_at: string | null
          created_at: string
          current_step: string
          payload: Json
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          auth_user_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          auth_user_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      merchant_provision_requests: {
        Row: {
          created_at: string
          error_code: string | null
          outlet_id: string | null
          request_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          outlet_id?: string | null
          request_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          outlet_id?: string | null
          request_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_provision_requests_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      onboarding_states: {
        Row: {
          booking_published: boolean
          completed_steps: Json
          created_at: string
          current_step: string
          first_service_created: boolean
          operations_configured: boolean
          outlet_id: string
          team_configured: boolean
          updated_at: string
        }
        Insert: {
          booking_published?: boolean
          completed_steps?: Json
          created_at?: string
          current_step?: string
          first_service_created?: boolean
          operations_configured?: boolean
          outlet_id: string
          team_configured?: boolean
          updated_at?: string
        }
        Update: {
          booking_published?: boolean
          completed_steps?: Json
          created_at?: string
          current_step?: string
          first_service_created?: boolean
          operations_configured?: boolean
          outlet_id?: string
          team_configured?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_states_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      outlet_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          outlet_id: string
          role: string
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          outlet_id: string
          role: string
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          outlet_id?: string
          role?: string
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "outlet_invitations_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      outlet_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          outlet_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          outlet_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          outlet_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_members_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      outlet_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          discount_percent: number | null
          hitpay_plan_id: string | null
          hitpay_recurring_id: string | null
          id: string
          interval_count: number | null
          mrr_reliable: boolean | null
          outlet_id: string
          provider: string
          quantity: number | null
          recurring_interval: string | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          trial_end: string | null
          unit_amount: number | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percent?: number | null
          hitpay_plan_id?: string | null
          hitpay_recurring_id?: string | null
          id: string
          interval_count?: number | null
          mrr_reliable?: boolean | null
          outlet_id: string
          provider?: string
          quantity?: number | null
          recurring_interval?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          trial_end?: string | null
          unit_amount?: number | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percent?: number | null
          hitpay_plan_id?: string | null
          hitpay_recurring_id?: string | null
          id?: string
          interval_count?: number | null
          mrr_reliable?: boolean | null
          outlet_id?: string
          provider?: string
          quantity?: number | null
          recurring_interval?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          trial_end?: string | null
          unit_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_subscriptions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      outlets: {
        Row: {
          access_status: string
          account_limit: number
          address: Json | null
          address_display: string | null
          booking_slug: string | null
          business_hours: Json | null
          business_type: string | null
          created_at: string | null
          email: string | null
          is_active: boolean | null
          name: string
          onboarding_status: string
          outlet_id: string
          owner_user_id: string | null
          phone: string | null
          phone_number: string | null
          reviews: Json | null
          service_categories: Json | null
          settings: Json | null
          status: string
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          access_status?: string
          account_limit?: number
          address?: Json | null
          address_display?: string | null
          booking_slug?: string | null
          business_hours?: Json | null
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          name: string
          onboarding_status?: string
          outlet_id: string
          owner_user_id?: string | null
          phone?: string | null
          phone_number?: string | null
          reviews?: Json | null
          service_categories?: Json | null
          settings?: Json | null
          status?: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          access_status?: string
          account_limit?: number
          address?: Json | null
          address_display?: string | null
          booking_slug?: string | null
          business_hours?: Json | null
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          name?: string
          onboarding_status?: string
          outlet_id?: string
          owner_user_id?: string | null
          phone?: string | null
          phone_number?: string | null
          reviews?: Json | null
          service_categories?: Json | null
          settings?: Json | null
          status?: string
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      outstanding_transactions: {
        Row: {
          amount: number | null
          client_id: string
          description: string | null
          id: string
          is_manual: boolean | null
          new_balance: number | null
          outlet_id: string
          previous_balance: number | null
          timestamp: string | null
          type: string
        }
        Insert: {
          amount?: number | null
          client_id: string
          description?: string | null
          id: string
          is_manual?: boolean | null
          new_balance?: number | null
          outlet_id: string
          previous_balance?: number | null
          timestamp?: string | null
          type: string
        }
        Update: {
          amount?: number | null
          client_id?: string
          description?: string | null
          id?: string
          is_manual?: boolean | null
          new_balance?: number | null
          outlet_id?: string
          previous_balance?: number | null
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "outstanding_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outstanding_transactions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      packages: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          outlet_id: string
          points: number | null
          price: number | null
          services: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          name?: string
          outlet_id: string
          points?: number | null
          price?: number | null
          services?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          outlet_id?: string
          points?: number | null
          price?: number | null
          services?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      platform_account_controls: {
        Row: {
          changed_at: string
          changed_by: string | null
          reason: string | null
          sessions_blocked_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          reason?: string | null
          sessions_blocked_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          reason?: string | null
          sessions_blocked_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_account_deletion_requests: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          id: string
          outlet_id: string | null
          processed_at: string | null
          processed_by: string | null
          processing_notes: string | null
          reason: string | null
          requester_name: string | null
          requesting_user_uid: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          id?: string
          outlet_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          reason?: string | null
          requester_name?: string | null
          requesting_user_uid?: string | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          id?: string
          outlet_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          reason?: string | null
          requester_name?: string | null
          requesting_user_uid?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_account_deletion_requests_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      platform_admin_operations: {
        Row: {
          action: string
          actor_uid: string
          attempt_count: number
          completed_at: string | null
          id: string
          outlet_id: string | null
          result: Json
          started_at: string
          state: string
          target_id: string
        }
        Insert: {
          action: string
          actor_uid: string
          attempt_count?: number
          completed_at?: string | null
          id: string
          outlet_id?: string | null
          result?: Json
          started_at?: string
          state: string
          target_id: string
        }
        Update: {
          action?: string
          actor_uid?: string
          attempt_count?: number
          completed_at?: string | null
          id?: string
          outlet_id?: string | null
          result?: Json
          started_at?: string
          state?: string
          target_id?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_uid: string | null
          affected_target: string
          id: string
          metadata: Json
          occurred_at: string
          operation_id: string | null
          outcome: string
          outlet_id: string | null
          reason: string | null
          source: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_uid?: string | null
          affected_target: string
          id?: string
          metadata?: Json
          occurred_at?: string
          operation_id?: string | null
          outcome?: string
          outlet_id?: string | null
          reason?: string | null
          source?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_uid?: string | null
          affected_target?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          operation_id?: string | null
          outcome?: string
          outlet_id?: string | null
          reason?: string | null
          source?: string
        }
        Relationships: []
      }
      platform_monitoring_events: {
        Row: {
          correlation_id: string | null
          event_type: string
          id: string
          message: string
          metadata: Json
          occurred_at: string
          outlet_id: string | null
          service: string
          severity: string
        }
        Insert: {
          correlation_id?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json
          occurred_at?: string
          outlet_id?: string | null
          service: string
          severity: string
        }
        Update: {
          correlation_id?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          occurred_at?: string
          outlet_id?: string | null
          service?: string
          severity?: string
        }
        Relationships: []
      }
      platform_support_case_events: {
        Row: {
          actor_email: string | null
          actor_uid: string
          after_value: Json | null
          before_value: Json | null
          case_id: string
          created_at: string
          event_type: string
          id: string
          note: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_uid: string
          after_value?: Json | null
          before_value?: Json | null
          case_id: string
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_uid?: string
          after_value?: Json | null
          before_value?: Json | null
          case_id?: string
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "platform_support_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_support_case_references: {
        Row: {
          case_id: string
          created_at: string
          created_by: string
          entity_type: string
          id: string
          outlet_id: string | null
          reference_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by: string
          entity_type: string
          id?: string
          outlet_id?: string | null
          reference_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string
          entity_type?: string
          id?: string
          outlet_id?: string | null
          reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_case_references_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "platform_support_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_support_case_references_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      platform_support_cases: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          outlet_id: string | null
          priority: string
          resolution_summary: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          outlet_id?: string | null
          priority: string
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          outlet_id?: string | null
          priority?: string
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_support_cases_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          amount: number | null
          client_id: string
          description: string | null
          id: string
          is_manual: boolean | null
          new_balance: number | null
          outlet_id: string
          previous_balance: number | null
          timestamp: string | null
          type: string
        }
        Insert: {
          amount?: number | null
          client_id: string
          description?: string | null
          id: string
          is_manual?: boolean | null
          new_balance?: number | null
          outlet_id: string
          previous_balance?: number | null
          timestamp?: string | null
          type: string
        }
        Update: {
          amount?: number | null
          client_id?: string
          description?: string | null
          id?: string
          is_manual?: boolean | null
          new_balance?: number | null
          outlet_id?: string
          previous_balance?: number | null
          timestamp?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      points_credits: {
        Row: {
          client_id: string
          credited_at: string | null
          points: number
          sale_id: string
        }
        Insert: {
          client_id: string
          credited_at?: string | null
          points: number
          sale_id: string
        }
        Update: {
          client_id?: string
          credited_at?: string | null
          points?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_credits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          fixed_commission_amount: number | null
          id: string
          name: string
          outlet_id: string
          price: number | null
          stock: number | null
        }
        Insert: {
          category?: string | null
          fixed_commission_amount?: number | null
          id: string
          name?: string
          outlet_id: string
          price?: number | null
          stock?: number | null
        }
        Update: {
          category?: string | null
          fixed_commission_amount?: number | null
          id?: string
          name?: string
          outlet_id?: string
          price?: number | null
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          cost: number | null
          icon: string | null
          id: string
          name: string
          outlet_id: string
        }
        Insert: {
          cost?: number | null
          icon?: string | null
          id: string
          name?: string
          outlet_id: string
        }
        Update: {
          cost?: number | null
          icon?: string | null
          id?: string
          name?: string
          outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          duration: number | null
          icon_id: string | null
          id: string
          image_url: string | null
          is_commissionable: boolean | null
          is_promotion: boolean | null
          is_visible: boolean | null
          name: string
          outlet_id: string
          points: number | null
          price: number | null
          redeem_points: number | null
          redeem_points_enabled: boolean | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration?: number | null
          icon_id?: string | null
          id: string
          image_url?: string | null
          is_commissionable?: boolean | null
          is_promotion?: boolean | null
          is_visible?: boolean | null
          name?: string
          outlet_id: string
          points?: number | null
          price?: number | null
          redeem_points?: number | null
          redeem_points_enabled?: boolean | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration?: number | null
          icon_id?: string | null
          id?: string
          image_url?: string | null
          is_commissionable?: boolean | null
          is_promotion?: boolean | null
          is_visible?: boolean | null
          name?: string
          outlet_id?: string
          points?: number | null
          price?: number | null
          redeem_points?: number | null
          redeem_points_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "services_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          outlet_id: string
          permissions: Json | null
          phone: string | null
          photo_url: string | null
          profile_picture: string | null
          qualified_services: Json | null
          role: string | null
          weekly_hours: Json | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string
          outlet_id: string
          permissions?: Json | null
          phone?: string | null
          photo_url?: string | null
          profile_picture?: string | null
          qualified_services?: Json | null
          role?: string | null
          weekly_hours?: Json | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          outlet_id?: string
          permissions?: Json | null
          phone?: string | null
          photo_url?: string | null
          profile_picture?: string | null
          qualified_services?: Json | null
          role?: string | null
          weekly_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          category: string | null
          client_id: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          items: Json | null
          outlet_id: string
          outstanding: number | null
          parent_sale_id: string | null
          payment_method: string | null
          payment_status: string | null
          remarks: string | null
          status: string | null
          type: string
          voided: boolean | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id: string
          items?: Json | null
          outlet_id: string
          outstanding?: number | null
          parent_sale_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          remarks?: string | null
          status?: string | null
          type: string
          voided?: boolean | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          items?: Json | null
          outlet_id?: string
          outstanding?: number | null
          parent_sale_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          remarks?: string | null
          status?: string | null
          type?: string
          voided?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          outlet_id: string | null
          role: string | null
          uid: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          outlet_id?: string | null
          role?: string | null
          uid: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          outlet_id?: string | null
          role?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
      vouchers: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          name: string
          outlet_id: string
          price: number | null
          purchased_at: string | null
          redeemed_at: string | null
          redemption_id: string | null
          secret_code: string | null
          service_ids: Json | null
          slug: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id: string
          name?: string
          outlet_id: string
          price?: number | null
          purchased_at?: string | null
          redeemed_at?: string | null
          redemption_id?: string | null
          secret_code?: string | null
          service_ids?: Json | null
          slug?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          name?: string
          outlet_id?: string
          price?: number | null
          purchased_at?: string | null
          redeemed_at?: string | null
          redemption_id?: string | null
          secret_code?: string | null
          service_ids?: Json | null
          slug?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["outlet_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _merchant_revenue_between: {
        Args: { p_end: string; p_outlet_id: string; p_start: string }
        Returns: number
      }
      abandon_pending_merchant_workspace: { Args: never; Returns: undefined }
      accept_outlet_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      append_platform_audit_event: {
        Args: {
          p_action: string
          p_affected_target: string
          p_metadata?: Json
          p_outlet_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: string
      }
      booking_slug_from_name: { Args: { value: string }; Returns: string }
      can_manage_outlet_accounts: {
        Args: { p_outlet_id: string }
        Returns: boolean
      }
      can_manage_outlet_integrations: {
        Args: { p_outlet_id: string; p_user_id: string }
        Returns: boolean
      }
      change_outlet_member_role: {
        Args: { p_member_id: string; p_role: string }
        Returns: undefined
      }
      complete_merchant_onboarding: { Args: { payload: Json }; Returns: Json }
      complete_pos_sale: {
        Args: { p_appointment_id?: string; p_transaction: Json }
        Returns: Json
      }
      create_merchant_workspace: {
        Args: {
          p_business_name: string
          p_business_type: string
          p_phone?: string
          p_request_id: string
        }
        Returns: Json
      }
      create_outlet_invitation: {
        Args: {
          invitation_role?: string
          invitee_email: string
          valid_hours?: number
        }
        Returns: Json
      }
      create_public_booking: {
        Args: {
          p_auth_uid?: string
          p_customer_name: string
          p_date: string
          p_email?: string
          p_outlet_id: string
          p_phone: string
          p_service_id: string
          p_staff_id?: string
          p_time: string
        }
        Returns: Json
      }
      create_public_booking_batch: {
        Args: {
          p_customer_name: string
          p_date: string
          p_email?: string
          p_items: Json
          p_outlet_id: string
          p_phone: string
          p_time: string
        }
        Returns: Json
      }
      current_portal_outlet_id: { Args: never; Returns: string }
      delete_appointment_and_linked_sale: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      ensure_customer_profile: { Args: never; Returns: Json }
      ensure_identity_profiles: { Args: never; Returns: Json }
      ensure_merchant_workspace: { Args: never; Returns: Json }
      get_public_available_slots: {
        Args: {
          p_date: string
          p_outlet_id: string
          p_service_id: string
          p_staff_id?: string
        }
        Returns: string[]
      }
      get_public_outlet: {
        Args: { p_outlet_id: string }
        Returns: {
          address_display: string
          booking_slug: string
          business_hours: Json
          is_active: boolean
          name: string
          outlet_id: string
          phone: string
          phone_number: string
          reviews: Json
          service_categories: Json
          timezone: string
        }[]
      }
      google_api_rate_limit_hit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      google_business_purge_expired: { Args: never; Returns: undefined }
      has_outlet_role: {
        Args: { p_outlet_id: string; p_roles: string[] }
        Returns: boolean
      }
      is_current_account_enabled: { Args: never; Returns: boolean }
      is_outlet_member: { Args: { p_outlet_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_portal_admin: { Args: never; Returns: boolean }
      is_portal_platform_admin: { Args: never; Returns: boolean }
      merchant_account_deletion_request_status: { Args: never; Returns: Json }
      merchant_adjust_client_credit: {
        Args: {
          p_amount: number
          p_client_id: string
          p_outlet_id: string
          p_staff_name?: string
          p_staff_remark?: string
          p_transaction_id?: string
          p_type: string
        }
        Returns: number
      }
      merchant_adjust_client_outstanding: {
        Args: {
          p_amount: number
          p_client_id: string
          p_outlet_id: string
          p_timestamp?: string
          p_type: string
        }
        Returns: string
      }
      merchant_adjust_client_points: {
        Args: {
          p_amount: number
          p_client_id: string
          p_description?: string
          p_is_manual?: boolean
          p_outlet_id: string
          p_type: string
        }
        Returns: string
      }
      merchant_credit_points_for_sale: {
        Args: {
          p_client_id: string
          p_outlet_id: string
          p_points: number
          p_sale_id: string
        }
        Returns: boolean
      }
      merchant_dashboard_aggregates: {
        Args: {
          p_month_end: string
          p_month_start: string
          p_outlet_id: string
          p_prev_month_end: string
          p_prev_month_start: string
          p_prev_week_end: string
          p_prev_week_start: string
          p_today: string
          p_week_end: string
          p_week_start: string
          p_yesterday: string
        }
        Returns: Json
      }
      merchant_monthly_report_summary: {
        Args: { p_month: number; p_outlet_id: string; p_year: number }
        Returns: Json
      }
      merchant_reverse_manual_point_transaction: {
        Args: { p_outlet_id: string; p_transaction_id: string }
        Returns: number
      }
      minutes_to_booking_time: { Args: { p_minutes: number }; Returns: string }
      parse_time_to_minutes: { Args: { time_str: string }; Returns: number }
      platform_account_deletion_requests_page: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_source?: string
          p_status?: string
        }
        Returns: Json
      }
      platform_activity_page: {
        Args: {
          p_end_date: string
          p_kind: string
          p_limit?: number
          p_offset?: number
          p_outlet_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      platform_add_support_reference: {
        Args: { p_case_id: string; p_reference_id: string; p_type: string }
        Returns: string
      }
      platform_create_support_case: {
        Args: {
          p_assigned_to?: string
          p_category: string
          p_description: string
          p_outlet_id: string
          p_priority: string
          p_references?: Json
          p_subject: string
        }
        Returns: string
      }
      platform_delete_outlet: {
        Args: { p_confirm_name: string; p_outlet_id: string; p_reason: string }
        Returns: Json
      }
      platform_global_search: {
        Args: { p_limit_per_group?: number; p_query: string }
        Returns: Json
      }
      platform_integrations_page: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_outlet_id?: string
          p_state?: string
          p_type?: string
        }
        Returns: Json
      }
      platform_jobs_page: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_outlet_id?: string
          p_state?: string
          p_to?: string
          p_type?: string
        }
        Returns: Json
      }
      platform_manage_outlet_member: {
        Args: {
          p_action: string
          p_outlet_id: string
          p_reason?: string
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      platform_monitoring_events_page: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      platform_onboarding_page: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_stage?: string
        }
        Returns: Json
      }
      platform_operations_overview: {
        Args: { p_end_date: string; p_outlet_id?: string; p_start_date: string }
        Returns: Json
      }
      platform_outlet_inspector: {
        Args: { p_outlet_id: string }
        Returns: Json
      }
      platform_reference_belongs_to_outlet: {
        Args: { p_outlet_id: string; p_reference_id: string; p_type: string }
        Returns: boolean
      }
      platform_remote_access: {
        Args: { p_action: string; p_outlet_id: string }
        Returns: Json
      }
      platform_sanitize_error: { Args: { p_value: string }; Returns: string }
      platform_sanitize_jsonb: { Args: { p_value: Json }; Returns: Json }
      platform_set_outlet_access: {
        Args: { p_enabled: boolean; p_outlet_id: string; p_reason: string }
        Returns: Json
      }
      platform_support_case_detail: {
        Args: { p_case_id: string }
        Returns: Json
      }
      platform_support_cases_page: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_outlet_id?: string
          p_priority?: string
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      platform_support_operators: { Args: never; Returns: Json }
      platform_transfer_outlet_ownership: {
        Args: {
          p_current_owner: string
          p_new_owner: string
          p_outlet_id: string
          p_reason: string
        }
        Returns: Json
      }
      platform_update_account_deletion_request: {
        Args: {
          p_processing_notes?: string
          p_request_id: string
          p_status: string
        }
        Returns: undefined
      }
      platform_update_support_case: {
        Args: {
          p_action: string
          p_assigned_to?: string
          p_case_id: string
          p_expected_updated_at?: string
          p_note?: string
          p_resolution_summary?: string
          p_status?: string
        }
        Returns: Json
      }
      public_voucher_confirm_redemption: {
        Args: { p_voucher_id: string }
        Returns: undefined
      }
      public_voucher_purchase: { Args: { p_voucher_id: string }; Returns: Json }
      recalc_client_last_renewal: {
        Args: { p_client_id: string; p_outlet_id: string }
        Returns: undefined
      }
      renew_member_membership: {
        Args: {
          p_amount: number
          p_client_id: string
          p_operator_name?: string
          p_payment_method?: string
          p_renewed_at?: string
        }
        Returns: Json
      }
      resolve_merchant_access: { Args: never; Returns: Json }
      resolve_public_booking_outlet: {
        Args: { p_segment: string }
        Returns: string
      }
      set_outlet_member_status: {
        Args: { p_member_id: string; p_status: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify_booking_name: { Args: { value: string }; Returns: string }
      staff_free_for_slot: {
        Args: {
          p_date: string
          p_end_minutes: number
          p_outlet_id: string
          p_staff_id: string
          p_start_minutes: number
        }
        Returns: boolean
      }
      submit_merchant_account_deletion_request: {
        Args: { p_reason?: string; p_source?: string }
        Returns: string
      }
      submit_public_account_deletion_request: {
        Args: {
          p_business_name?: string
          p_email: string
          p_reason?: string
          p_requester_name?: string
        }
        Returns: string
      }
      submit_public_review: {
        Args: {
          p_author?: string
          p_outlet_id: string
          p_rating?: number
          p_text?: string
        }
        Returns: Json
      }
      text_or_null: { Args: { value: string }; Returns: string }
      transfer_outlet_ownership: {
        Args: {
          p_confirmation: string
          p_new_owner: string
          p_outlet_id: string
        }
        Returns: undefined
      }
      upsert_frontend_customer_profile: {
        Args: { p_email?: string; p_name?: string }
        Returns: Json
      }
      void_sale_and_remove_linked_appointments: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: Json
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
