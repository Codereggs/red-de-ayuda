/**
 * Supabase database type definitions.
 * Regenerate from the live project with:
 *   npx supabase gen types typescript --project-id <id> > src/shared/types/database.types.ts
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'helper'
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'helper'
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'helper'
          status?: 'active' | 'inactive'
          updated_at?: string
        }
      }

      situation_categories: {
        Row: {
          id: string
          name: string
          normalized_name: string
          created_by_user_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          normalized_name: string
          created_by_user_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          name?: string
          normalized_name?: string
          deleted_at?: string | null
          updated_at?: string
        }
      }

      need_categories: {
        Row: {
          id: string
          name: string
          normalized_name: string
          created_by_user_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          normalized_name: string
          created_by_user_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          name?: string
          normalized_name?: string
          deleted_at?: string | null
          updated_at?: string
        }
      }

      help_types: {
        Row: {
          id: string
          name: string
          normalized_name: string
          created_by_user_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          normalized_name: string
          created_by_user_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          name?: string
          normalized_name?: string
          deleted_at?: string | null
          updated_at?: string
        }
      }

      cases: {
        Row: {
          id: string
          public_code: string
          case_type: 'person' | 'family'
          full_name: string
          situation_category_id: string
          public_notes: string | null
          public_contact_place: string
          country: string
          state: string
          city: string
          status: 'active' | 'archived'
          verified: boolean
          /** Denormalized from help_records — maintained by DB trigger */
          last_helped_at: string | null
          created_by_user_id: string | null
          updated_by_user_id: string | null
          archived_by_user_id: string | null
          archive_reason: string | null
          archived_at: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          public_code?: string
          case_type: 'person' | 'family'
          full_name: string
          situation_category_id: string
          public_notes?: string | null
          public_contact_place: string
          country?: string
          state: string
          city: string
          status?: 'active' | 'archived'
          verified?: boolean
          last_helped_at?: string | null
          created_by_user_id?: string | null
          updated_by_user_id?: string | null
          archived_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          case_type?: 'person' | 'family'
          full_name?: string
          situation_category_id?: string
          public_notes?: string | null
          public_contact_place?: string
          country?: string
          state?: string
          city?: string
          status?: 'active' | 'archived'
          verified?: boolean
          updated_by_user_id?: string | null
          archived_by_user_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          deleted_at?: string | null
          updated_at?: string
        }
      }

      case_private_data: {
        Row: {
          id: string
          case_id: string
          id_number: string
          birth_date: string | null
          previous_full_address: string
          current_full_address: string
          verification_notes: string
          private_notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          id_number: string
          birth_date?: string | null
          previous_full_address: string
          current_full_address: string
          verification_notes: string
          private_notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id_number?: string
          birth_date?: string | null
          previous_full_address?: string
          current_full_address?: string
          verification_notes?: string
          private_notes?: string | null
          deleted_at?: string | null
          updated_at?: string
        }
      }

      case_phones: {
        Row: {
          id: string
          case_id: string
          phone: string
          label: string | null
          is_primary: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          phone: string
          label?: string | null
          is_primary?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          phone?: string
          label?: string | null
          is_primary?: boolean
          deleted_at?: string | null
          updated_at?: string
        }
      }

      assistance_methods: {
        Row: {
          id: string
          case_id: string
          type: 'bank_transfer' | 'pago_movil' | 'cash_contact' | 'physical_delivery'
          label: string
          is_primary: boolean
          is_active: boolean
          holder_full_name: string
          id_number: string
          phone: string
          bank_name: string | null
          account_number: string | null
          account_type: string | null
          previous_full_address: string
          current_full_address: string
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          type: 'bank_transfer' | 'pago_movil' | 'cash_contact' | 'physical_delivery'
          label: string
          is_primary?: boolean
          is_active?: boolean
          holder_full_name: string
          id_number: string
          phone: string
          bank_name?: string | null
          account_number?: string | null
          account_type?: string | null
          previous_full_address: string
          current_full_address: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          type?: 'bank_transfer' | 'pago_movil' | 'cash_contact' | 'physical_delivery'
          label?: string
          is_primary?: boolean
          is_active?: boolean
          holder_full_name?: string
          id_number?: string
          phone?: string
          bank_name?: string | null
          account_number?: string | null
          account_type?: string | null
          previous_full_address?: string
          current_full_address?: string
          notes?: string | null
          deleted_at?: string | null
          updated_at?: string
        }
      }

      case_needs: {
        Row: {
          id: string
          case_id: string
          need_category_id: string
          quantity: number
          unit: string | null
          comments: string | null
          created_by_user_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          need_category_id: string
          quantity: number
          unit?: string | null
          comments?: string | null
          created_by_user_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          need_category_id?: string
          quantity?: number
          unit?: string | null
          comments?: string | null
          deleted_at?: string | null
          updated_at?: string
        }
      }

      help_records: {
        Row: {
          id: string
          case_id: string
          help_type_id: string
          created_by_user_id: string | null
          title: string
          description: string | null
          amount_usd: number | null
          /** Date only — format YYYY-MM-DD */
          helped_at: string
          private_notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          help_type_id: string
          created_by_user_id?: string | null
          title: string
          description?: string | null
          amount_usd?: number | null
          helped_at?: string
          private_notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          help_type_id?: string
          title?: string
          description?: string | null
          amount_usd?: number | null
          helped_at?: string
          private_notes?: string | null
          deleted_at?: string | null
          updated_at?: string
        }
      }

      help_record_needs: {
        Row: {
          id: string
          help_record_id: string
          case_need_id: string
          created_at: string
        }
        Insert: {
          id?: string
          help_record_id: string
          case_need_id: string
          created_at?: string
        }
        Update: Record<string, never>
      }

      assistance_method_access_logs: {
        Row: {
          id: string
          case_id: string
          assistance_method_id: string | null
          action: 'viewed' | 'copied'
          ip_hash: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          assistance_method_id?: string | null
          action: 'viewed' | 'copied'
          ip_hash?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Record<string, never>
      }

      audit_logs: {
        Row: {
          id: string
          actor_user_id: string | null
          entity_type: string
          entity_id: string | null
          action: string
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_user_id?: string | null
          entity_type: string
          entity_id?: string | null
          action: string
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: Record<string, never>
      }

      webhook_events: {
        Row: {
          id: string
          event_type: string
          payload: Record<string, unknown>
          status: 'pending' | 'sent' | 'failed' | 'disabled'
          attempts: number
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_type: string
          payload?: Record<string, unknown>
          /** Always 'disabled' in MVP — no external delivery */
          status?: 'pending' | 'sent' | 'failed' | 'disabled'
          attempts?: number
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'sent' | 'failed' | 'disabled'
          attempts?: number
          last_error?: string | null
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

/** Convenience Row type aliases */
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Case = Database['public']['Tables']['cases']['Row']
export type CasePrivateData = Database['public']['Tables']['case_private_data']['Row']
export type CasePhone = Database['public']['Tables']['case_phones']['Row']
export type AssistanceMethod = Database['public']['Tables']['assistance_methods']['Row']
export type CaseNeed = Database['public']['Tables']['case_needs']['Row']
export type HelpRecord = Database['public']['Tables']['help_records']['Row']
export type HelpRecordNeed = Database['public']['Tables']['help_record_needs']['Row']
export type SituationCategory = Database['public']['Tables']['situation_categories']['Row']
export type NeedCategory = Database['public']['Tables']['need_categories']['Row']
export type HelpType = Database['public']['Tables']['help_types']['Row']
export type AssistanceMethodAccessLog =
  Database['public']['Tables']['assistance_method_access_logs']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row']
