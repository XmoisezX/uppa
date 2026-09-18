/**
 * Estrutura base de tipos gerados pelo Supabase.
 * Será populado automaticamente via migrations nas próximas etapas.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      states: {
        Row: {
          id: string;
          name: string;
          code: string;
          ibge_code: number;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          ibge_code: number;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          ibge_code?: number;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          state_id: string;
          name: string;
          ibge_code: number | null;
          slug: string;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          state_id: string;
          name: string;
          ibge_code?: number | null;
          slug: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          state_id?: string;
          name?: string;
          ibge_code?: number | null;
          slug?: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cities_state_id_fkey";
            columns: ["state_id"];
            isOneToOne: false;
            referencedRelation: "states";
            referencedColumns: ["id"];
          }
        ];
      };
      neighborhoods: {
        Row: {
          id: string;
          city_id: string;
          name: string;
          slug: string;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          city_id: string;
          name: string;
          slug: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          city_id?: string;
          name?: string;
          slug?: string;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "neighborhoods_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          }
        ];
      };
      agencies: {
        Row: {
          id: string;
          name: string;
          slug: string;
          legal_name: string | null;
          document: string | null;
          creci: string;
          phone: string | null;
          whatsapp: string;
          email: string;
          website: string | null;
          logo_url: string | null;
          description: string | null;
          city_id: string | null;
          verified_at: string | null;
          status: "active" | "pending" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          legal_name?: string | null;
          document?: string | null;
          creci: string;
          phone?: string | null;
          whatsapp: string;
          email: string;
          website?: string | null;
          logo_url?: string | null;
          description?: string | null;
          city_id?: string | null;
          verified_at?: string | null;
          status?: "active" | "pending" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          legal_name?: string | null;
          document?: string | null;
          creci?: string;
          phone?: string | null;
          whatsapp?: string;
          email?: string;
          website?: string | null;
          logo_url?: string | null;
          description?: string | null;
          city_id?: string | null;
          verified_at?: string | null;
          status?: "active" | "pending" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agencies_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          }
        ];
      };
      agency_members: {
        Row: {
          id: string;
          agency_id: string;
          user_id: string;
          role: "owner" | "admin" | "manager" | "broker" | "viewer";
          status: "active" | "pending" | "suspended";
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          user_id: string;
          role?: "owner" | "admin" | "manager" | "broker" | "viewer";
          status?: "active" | "pending" | "suspended";
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "manager" | "broker" | "viewer";
          status?: "active" | "pending" | "suspended";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          }
        ];
      };
      properties: {
        Row: {
          id: string;
          agency_id: string;
          broker_id: string | null;
          external_id: string;
          source: "manual" | "vrsync" | "api" | "csv" | "partner";
          slug: string;
          title: string;
          description: string | null;
          transaction_type: "sale" | "rent" | "sale_or_rent";
          property_type:
            | "apartment"
            | "house"
            | "townhouse"
            | "land"
            | "farm"
            | "commercial"
            | "office"
            | "warehouse"
            | "studio"
            | "loft"
            | "kitnet"
            | "penthouse"
            | "condo_house"
            | "rural"
            | "other";
          status:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived";
          price: number | null;
          rent_price: number | null;
          condominium_fee: number | null;
          iptu: number | null;
          bedrooms: number;
          suites: number;
          bathrooms: number;
          parking_spaces: number;
          usable_area: number | null;
          total_area: number | null;
          lot_area: number | null;
          year_built: number | null;
          financiable: boolean;
          accepts_exchange: boolean;
          accepts_vehicle: boolean;
          furnished: boolean;
          pet_friendly: boolean;
          address_visible: boolean;
          street: string | null;
          number: string | null;
          complement: string | null;
          zipcode: string | null;
          state_id: string | null;
          city_id: string | null;
          neighborhood_id: string | null;
          latitude: number | null;
          longitude: number | null;
          location: unknown | null;
          published_at: string | null;
          source_updated_at: string | null;
          missing_from_feed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          broker_id?: string | null;
          external_id: string;
          source?: "manual" | "vrsync" | "api" | "csv" | "partner";
          slug: string;
          title: string;
          description?: string | null;
          transaction_type: "sale" | "rent" | "sale_or_rent";
          property_type:
            | "apartment"
            | "house"
            | "townhouse"
            | "land"
            | "farm"
            | "commercial"
            | "office"
            | "warehouse"
            | "studio"
            | "loft"
            | "kitnet"
            | "penthouse"
            | "condo_house"
            | "rural"
            | "other";
          status?:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived";
          price?: number | null;
          rent_price?: number | null;
          condominium_fee?: number | null;
          iptu?: number | null;
          bedrooms?: number;
          suites?: number;
          bathrooms?: number;
          parking_spaces?: number;
          usable_area?: number | null;
          total_area?: number | null;
          lot_area?: number | null;
          year_built?: number | null;
          financiable?: boolean;
          accepts_exchange?: boolean;
          accepts_vehicle?: boolean;
          furnished?: boolean;
          pet_friendly?: boolean;
          address_visible?: boolean;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          zipcode?: string | null;
          state_id?: string | null;
          city_id?: string | null;
          neighborhood_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          published_at?: string | null;
          source_updated_at?: string | null;
          missing_from_feed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          broker_id?: string | null;
          external_id?: string;
          source?: "manual" | "vrsync" | "api" | "csv" | "partner";
          slug?: string;
          title?: string;
          description?: string | null;
          transaction_type?: "sale" | "rent" | "sale_or_rent";
          property_type?:
            | "apartment"
            | "house"
            | "townhouse"
            | "land"
            | "farm"
            | "commercial"
            | "office"
            | "warehouse"
            | "studio"
            | "loft"
            | "kitnet"
            | "penthouse"
            | "condo_house"
            | "rural"
            | "other";
          status?:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived";
          price?: number | null;
          rent_price?: number | null;
          condominium_fee?: number | null;
          iptu?: number | null;
          bedrooms?: number;
          suites?: number;
          bathrooms?: number;
          parking_spaces?: number;
          usable_area?: number | null;
          total_area?: number | null;
          lot_area?: number | null;
          year_built?: number | null;
          financiable?: boolean;
          accepts_exchange?: boolean;
          accepts_vehicle?: boolean;
          furnished?: boolean;
          pet_friendly?: boolean;
          address_visible?: boolean;
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          zipcode?: string | null;
          state_id?: string | null;
          city_id?: string | null;
          neighborhood_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          location?: unknown | null;
          published_at?: string | null;
          source_updated_at?: string | null;
          missing_from_feed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_state_id_fkey";
            columns: ["state_id"];
            isOneToOne: false;
            referencedRelation: "states";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          }
        ];
      };
      features: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          category?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          category?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      property_features: {
        Row: {
          property_id: string;
          feature_id: string;
          created_at: string;
        };
        Insert: {
          property_id: string;
          feature_id: string;
          created_at?: string;
        };
        Update: {
          property_id?: string;
          feature_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_features_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_features_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "features";
            referencedColumns: ["id"];
          }
        ];
      };
      property_media: {
        Row: {
          id: string;
          property_id: string;
          type: "image" | "video" | "virtual_tour" | "floor_plan";
          url: string;
          thumbnail_url: string | null;
          width: number | null;
          height: number | null;
          position: number;
          is_cover: boolean;
          source_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          type?: "image" | "video" | "virtual_tour" | "floor_plan";
          url: string;
          thumbnail_url?: string | null;
          width?: number | null;
          height?: number | null;
          position?: number;
          is_cover?: boolean;
          source_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          type?: "image" | "video" | "virtual_tour" | "floor_plan";
          url?: string;
          thumbnail_url?: string | null;
          width?: number | null;
          height?: number | null;
          position?: number;
          is_cover?: boolean;
          source_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      property_price_history: {
        Row: {
          id: string;
          property_id: string;
          price: number | null;
          rent_price: number | null;
          source: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          price?: number | null;
          rent_price?: number | null;
          source?: string;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          price?: number | null;
          rent_price?: number | null;
          source?: string;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_price_history_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      property_status_history: {
        Row: {
          id: string;
          property_id: string;
          from_status:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived"
            | null;
          to_status:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived";
          changed_by: string | null;
          reason: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          from_status?:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived"
            | null;
          to_status:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived";
          changed_by?: string | null;
          reason?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          from_status?:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived"
            | null;
          to_status?:
            | "draft"
            | "pending"
            | "active"
            | "inactive"
            | "sold"
            | "rented"
            | "blocked"
            | "archived";
          changed_by?: string | null;
          reason?: string | null;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_status_history_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          property_id: string | null;
          agency_id: string;
          broker_id: string | null;
          consumer_user_id: string | null;
          name: string | null;
          email: string | null;
          phone: string | null;
          source: Database["public"]["Enums"]["lead_source"];
          message: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          agency_id: string;
          broker_id?: string | null;
          consumer_user_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          message?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string | null;
          agency_id?: string;
          broker_id?: string | null;
          consumer_user_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          message?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      lead_events: {
        Row: {
          id: string;
          lead_id: string;
          event: string;
          metadata: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          event?: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          event?: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          }
        ];
      };
      feeds: {
        Row: {
          id: string;
          agency_id: string;
          type: "vrsync" | "custom_xml" | "api";
          url: string;
          username_encrypted: string | null;
          password_encrypted: string | null;
          status: "active" | "paused" | "error";
          sync_interval_minutes: number;
          last_sync_at: string | null;
          next_sync_at: string | null;
          sync_locked_until: string | null;
          retry_count: number;
          max_retries: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          type?: "vrsync" | "custom_xml" | "api";
          url: string;
          username_encrypted?: string | null;
          password_encrypted?: string | null;
          status?: "active" | "paused" | "error";
          sync_interval_minutes?: number;
          last_sync_at?: string | null;
          next_sync_at?: string | null;
          sync_locked_until?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          type?: "vrsync" | "custom_xml" | "api";
          url?: string;
          username_encrypted?: string | null;
          password_encrypted?: string | null;
          status?: "active" | "paused" | "error";
          sync_interval_minutes?: number;
          last_sync_at?: string | null;
          next_sync_at?: string | null;
          sync_locked_until?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feeds_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          }
        ];
      };
      feed_runs: {
        Row: {
          id: string;
          feed_id: string;
          agency_id: string;
          started_at: string;
          finished_at: string | null;
          status: "running" | "completed" | "completed_with_errors" | "failed";
          items_found: number;
          items_created: number;
          items_updated: number;
          items_deactivated: number;
          items_failed: number;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          feed_id: string;
          agency_id: string;
          started_at?: string;
          finished_at?: string | null;
          status?: "running" | "completed" | "completed_with_errors" | "failed";
          items_found?: number;
          items_created?: number;
          items_updated?: number;
          items_deactivated?: number;
          items_failed?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          feed_id?: string;
          agency_id?: string;
          started_at?: string;
          finished_at?: string | null;
          status?: "running" | "completed" | "completed_with_errors" | "failed";
          items_found?: number;
          items_created?: number;
          items_updated?: number;
          items_deactivated?: number;
          items_failed?: number;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feed_runs_feed_id_fkey";
            columns: ["feed_id"];
            isOneToOne: false;
            referencedRelation: "feeds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_runs_agency_id_fkey";
            columns: ["agency_id"];
            isOneToOne: false;
            referencedRelation: "agencies";
            referencedColumns: ["id"];
          }
        ];
      };
      feed_errors: {
        Row: {
          id: string;
          feed_run_id: string;
          external_id: string | null;
          error_type: string;
          message: string;
          payload: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          feed_run_id: string;
          external_id?: string | null;
          error_type: string;
          message: string;
          payload?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          feed_run_id?: string;
          external_id?: string | null;
          error_type?: string;
          message?: string;
          payload?: Record<string, any> | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feed_errors_feed_run_id_fkey";
            columns: ["feed_run_id"];
            isOneToOne: false;
            referencedRelation: "feed_runs";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_agency_member: {
        Args: { agency_uuid: string };
        Returns: boolean;
      };
      is_agency_admin_or_owner: {
        Args: { agency_uuid: string };
        Returns: boolean;
      };
      acquire_feed_sync_lock: {
        Args: { p_feed_id: string; p_lock_duration_seconds?: number };
        Returns: boolean;
      };
      release_feed_sync_lock: {
        Args: { p_feed_id: string };
        Returns: void;
      };
    };
    Enums: {
      user_role: "consumer" | "broker" | "agency_member" | "agency_admin" | "platform_admin";
      agency_member_role: "owner" | "admin" | "manager" | "broker" | "viewer";
      transaction_type: "sale" | "rent" | "sale_or_rent";
      property_status: "draft" | "pending" | "active" | "inactive" | "sold" | "rented" | "blocked" | "archived";
      property_type:
        | "apartment"
        | "house"
        | "townhouse"
        | "land"
        | "farm"
        | "commercial"
        | "office"
        | "warehouse"
        | "studio"
        | "loft"
        | "kitnet"
        | "penthouse"
        | "condo_house"
        | "rural"
        | "other";
      listing_source: "manual" | "vrsync" | "api" | "csv" | "partner";
      media_type: "image" | "video" | "virtual_tour" | "floor_plan";
      lead_source: "whatsapp" | "form" | "phone" | "email" | "financing";
    };
  };
}
