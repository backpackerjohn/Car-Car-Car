export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MessageRole = 'user' | 'assistant' | 'system';

export interface FieldMapping {
    [key: string]: string;
}

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
            id: string
            created_at: string
            personal_info: Json
            vehicle_info: Json
            financial_info: Json
            sales_info: Json
        }
        Insert: {
            id?: string
            created_at?: string
            personal_info: Json
            vehicle_info: Json
            financial_info: Json
            sales_info: Json
        }
        Update: {
            id?: string
            created_at?: string
            personal_info?: Json
            vehicle_info?: Json
            financial_info?: Json
            sales_info?: Json
        }
      }
      messages: {
        Row: {
          id: number;
          customer_id: string;
          role: MessageRole;
          text: string;
          timestamp: string;
        };
        Insert: {
          customer_id: string;
          role: MessageRole;
          text: string;
          timestamp: string;
        };
        Update: {
          id?: number;
          customer_id?: string;
          role?: MessageRole;
          text?: string;
          timestamp?: string;
        };
      }
      pdf_templates: {
        Row: {
          id: string
          name: string
          file_name: string | null
          storage_path: string | null
          discovered_fields: string[] | null
          mappings: FieldMapping | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          file_name?: string | null
          storage_path?: string | null
          discovered_fields?: string[] | null
          mappings?: FieldMapping | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          file_name?: string | null
          storage_path?: string | null
          discovered_fields?: string[] | null
          mappings?: FieldMapping | null
          updated_at?: string | null
        }
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
