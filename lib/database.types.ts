export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      lottery_results: {
        Row: {
          id: number
          draw_name: string
          date: string
          gagnants: number[]
          machine: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          draw_name: string
          date: string
          gagnants: number[]
          machine?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          draw_name?: string
          date?: string
          gagnants?: number[]
          machine?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ml_models: {
        Row: {
          id: number
          draw_name: string
          model_type: 'lstm' | 'cnn' | 'ensemble' | 'pattern'
          model_data: Json
          performance_metrics: Json | null
          training_data_hash: string | null
          version: string | null
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: number
          draw_name: string
          model_type: 'lstm' | 'cnn' | 'ensemble' | 'pattern'
          model_data: Json
          performance_metrics?: Json | null
          training_data_hash?: string | null
          version?: string | null
          created_at?: string
          is_active?: boolean
        }
        Update: {
          id?: number
          draw_name?: string
          model_type?: 'lstm' | 'cnn' | 'ensemble' | 'pattern'
          model_data?: Json
          performance_metrics?: Json | null
          training_data_hash?: string | null
          version?: string | null
          created_at?: string
          is_active?: boolean
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          id: number
          draw_name: string
          predicted_numbers: number[]
          confidence: number | null
          model_used: string
          prediction_date: string
          actual_result_id: number | null
          accuracy: number | null
        }
        Insert: {
          id?: number
          draw_name: string
          predicted_numbers: number[]
          confidence?: number | null
          model_used: string
          prediction_date?: string
          actual_result_id?: number | null
          accuracy?: number | null
        }
        Update: {
          id?: number
          draw_name?: string
          predicted_numbers?: number[]
          confidence?: number | null
          model_used?: string
          prediction_date?: string
          actual_result_id?: number | null
          accuracy?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_actual_result_id_fkey"
            columns: ["actual_result_id"]
            isOneToOne: false
            referencedRelation: "lottery_results"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_schedules: {
        Row: {
          id: number
          day_of_week: string
          time_slot: string
          draw_name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          day_of_week: string
          time_slot: string
          draw_name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          day_of_week?: string
          time_slot?: string
          draw_name?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      draw_statistics: {
        Row: {
          draw_name: string | null
          total_draws: number | null
          first_draw: string | null
          last_draw: string | null
          avg_numbers_count: number | null
          machine_numbers_count: number | null
        }
        Relationships: []
      }
      number_frequencies: {
        Row: {
          draw_name: string | null
          number: number | null
          frequency: number | null
          percentage: number | null
        }
        Relationships: []
      }
      model_performance: {
        Row: {
          draw_name: string | null
          model_used: string | null
          total_predictions: number | null
          avg_confidence: number | null
          avg_accuracy: number | null
          high_accuracy_predictions: number | null
          last_prediction: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_prediction_accuracy: {
        Args: {
          predicted_numbers: number[]
          actual_numbers: number[]
        }
        Returns: number
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
