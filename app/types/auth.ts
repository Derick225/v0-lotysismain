// Types pour l'authentification Lotysis
import { User, Session } from '@supabase/supabase-js'
export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: 'user' | 'admin' | 'moderator'
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  phone?: string
  date_of_birth?: string
  country?: string
  city?: string
  bio?: string
  website?: string
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  total_predictions: number
  successful_predictions: number
  favorite_lottery_types: string[]
  created_at: string
  updated_at: string
  last_login_at?: string
  email_verified_at?: string
}

export interface UserPreferences {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  language: 'fr' | 'en'
  timezone: string
  date_format: string
  currency: string
  default_lottery_type: string
  auto_save_predictions: boolean
  show_prediction_confidence: boolean
  max_predictions_history: number
  enable_ai_predictions: boolean
  ai_model_preference: 'xgboost' | 'lstm' | 'montecarlo' | 'reinforcement' | 'ensemble'
  prediction_algorithms: string[]
  two_factor_enabled: boolean
  session_timeout: number
  require_password_change: boolean
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  profile: UserProfile | null
  preferences: UserPreferences | null
  session: Session | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterData {
  email: string
  password: string
  full_name: string
  phone?: string
  country?: string
  city?: string
}

export interface ResetPasswordData {
  email: string
}

export interface UpdateProfileData {
  full_name?: string
  avatar_url?: string
  phone?: string
  date_of_birth?: string
  country?: string
  city?: string
  bio?: string
  website?: string
  email_notifications?: boolean
  push_notifications?: boolean
  sms_notifications?: boolean
}

export interface UpdatePreferencesData {
  theme?: 'light' | 'dark' | 'system'
  language?: 'fr' | 'en'
  timezone?: string
  date_format?: string
  currency?: string
  default_lottery_type?: string
  auto_save_predictions?: boolean
  show_prediction_confidence?: boolean
  max_predictions_history?: number
  enable_ai_predictions?: boolean
  ai_model_preference?: 'xgboost' | 'lstm' | 'montecarlo' | 'reinforcement' | 'ensemble'
  prediction_algorithms?: string[]
  two_factor_enabled?: boolean
  session_timeout?: number
}
