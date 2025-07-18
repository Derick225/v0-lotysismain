import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type {
  UserProfile,
  UserPreferences,
  AuthState,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  UpdateProfileData,
  UpdatePreferencesData
} from '../types/auth'

// Service d'authentification
export class AuthService {
  private static instance: AuthService
  private supabase = createClientComponentClient()

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  // Connexion
  async signIn(credentials: LoginCredentials): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (!error && data.user) {
        // Enregistrer la tentative de connexion réussie
        await this.logLoginAttempt(credentials.email, true)
        
        // Mettre à jour last_login_at
        await this.updateLastLogin(data.user.id)
        
        // Créer une session de suivi
        await this.createUserSession(data.user.id)
      } else if (error) {
        // Enregistrer la tentative de connexion échouée
        await this.logLoginAttempt(credentials.email, false, error.message)
      }

      return { user: data.user, error }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error)
      return { user: null, error: error as AuthError }
    }
  }

  // Inscription
  async signUp(data: RegisterData): Promise<{ user: User | null; error: AuthError | null }> {
    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            phone: data.phone,
            country: data.country || 'BJ',
            city: data.city,
          }
        }
      })

      if (!error && authData.user) {
        // Le profil sera créé automatiquement par le trigger
        await this.logLoginAttempt(data.email, true)
      } else if (error) {
        await this.logLoginAttempt(data.email, false, error.message)
      }

      return { user: authData.user, error }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error)
      return { user: null, error: error as AuthError }
    }
  }

  // Déconnexion
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      // Marquer la session comme inactive
      const { data: { user } } = await this.supabase.auth.getUser()
      if (user) {
        await this.endUserSession(user.id, 'logout')
      }

      const { error } = await this.supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      return { error: error as AuthError }
    }
  }

  // Récupération de mot de passe
  async resetPassword(data: ResetPasswordData): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      return { error }
    } catch (error) {
      console.error('Erreur lors de la récupération de mot de passe:', error)
      return { error: error as AuthError }
    }
  }

  // Mise à jour du mot de passe
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      })
      return { error }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error)
      return { error: error as AuthError }
    }
  }

  // Obtenir l'utilisateur actuel
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error)
      return null
    }
  }

  // Obtenir la session actuelle
  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('Erreur lors de la récupération de la session:', error)
      return null
    }
  }

  // Obtenir le profil utilisateur
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId || (await this.getCurrentUser())?.id)
        .single()

      if (error) {
        console.error('Erreur lors de la récupération du profil:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error)
      return null
    }
  }

  // Obtenir les préférences utilisateur
  async getUserPreferences(userId?: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId || (await this.getCurrentUser())?.id)
        .single()

      if (error) {
        console.error('Erreur lors de la récupération des préférences:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences:', error)
      return null
    }
  }

  // Mettre à jour le profil
  async updateProfile(updates: UpdateProfileData): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser()
      if (!user) {
        return { error: new Error('Utilisateur non connecté') }
      }

      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      return { error }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error)
      return { error: error as Error }
    }
  }

  // Mettre à jour les préférences
  async updatePreferences(updates: UpdatePreferencesData): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser()
      if (!user) {
        return { error: new Error('Utilisateur non connecté') }
      }

      const { error } = await this.supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)

      return { error }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error)
      return { error: error as Error }
    }
  }

  // Vérifier si l'utilisateur est admin
  async isAdmin(userId?: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId)
      return profile?.role === 'admin'
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle admin:', error)
      return false
    }
  }

  // Méthodes privées pour la gestion des sessions et logs

  private async logLoginAttempt(email: string, success: boolean, failureReason?: string): Promise<void> {
    try {
      await this.supabase
        .from('login_attempts')
        .insert({
          email,
          success,
          failure_reason: failureReason,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
        })
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la tentative de connexion:', error)
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)
    } catch (error) {
      console.error('Erreur lors de la mise à jour de last_login_at:', error)
    }
  }

  private async createUserSession(userId: string): Promise<void> {
    try {
      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 heures

      await this.supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_token: sessionToken,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          device_type: this.getDeviceType(),
          browser: this.getBrowser(),
          os: this.getOS(),
          expires_at: expiresAt.toISOString(),
        })
    } catch (error) {
      console.error('Erreur lors de la création de la session:', error)
    }
  }

  private async endUserSession(userId: string, reason: string): Promise<void> {
    try {
      await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          logout_reason: reason,
        })
        .eq('user_id', userId)
        .eq('is_active', true)
    } catch (error) {
      console.error('Erreur lors de la fermeture de la session:', error)
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      return '0.0.0.0'
    }
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet'
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile'
    }
    return 'desktop'
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  private getOS(): string {
    const userAgent = navigator.userAgent
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'Unknown'
  }
}

// Instance singleton
export const authService = AuthService.getInstance()

// Fonctions utilitaires pour les composants serveur
export async function getServerUser() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getServerSession() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireAuth() {
  const user = await getServerUser()
  if (!user) {
    redirect('/auth/login')
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  const supabase = createServerComponentClient({ cookies })
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/unauthorized')
  }
  
  return user
}
