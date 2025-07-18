export interface UserProfile {
  id: string
  full_name?: string
  phone?: string
  country?: string
  city?: string
  role?: 'user' | 'admin'
  last_login_at?: string
}

export interface UserPreferences {
  user_id: string
  theme?: 'light' | 'dark' | 'system'
  language?: 'fr' | 'en'
  enable_ai_predictions?: boolean
}

export interface AuthState {
  user: import('@supabase/supabase-js').User | null
  profile: UserProfile | null
  preferences: UserPreferences | null
  session: import('@supabase/supabase-js').Session | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
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
  phone?: string
  country?: string
  city?: string
}

export interface UpdatePreferencesData {
  theme?: 'light' | 'dark' | 'system'
  language?: 'fr' | 'en'
  enable_ai_predictions?: boolean
}
