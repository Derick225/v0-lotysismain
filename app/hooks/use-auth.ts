'use client'

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/ssr'
import type { User, Session } from '@supabase/supabase-js'
import { authService } from '../lib/auth-client'
import type {
  AuthState,
  UserProfile,
  UserPreferences,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  UpdateProfileData,
  UpdatePreferencesData
} from '../types/auth'

interface AuthContextType extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  signUp: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (data: ResetPasswordData) => Promise<{ success: boolean; error?: string }>
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: UpdateProfileData) => Promise<{ success: boolean; error?: string }>
  updatePreferences: (updates: UpdatePreferencesData) => Promise<{ success: boolean; error?: string }>
  refreshProfile: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    preferences: null,
    session: null,
    loading: true,
    error: null,
  })

  const router = useRouter()
  const supabase = createClientComponentClient()

  const loadUserData = async (user: User) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const [profile, preferences] = await Promise.all([
        authService.getUserProfile(user.id),
        authService.getUserPreferences(user.id)
      ])

      setState(prev => ({
        ...prev,
        user,
        profile,
        preferences,
        loading: false,
      }))
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Erreur lors du chargement des données utilisateur'
      }))
    }
  }

  const refreshProfile = async () => {
    if (!state.user) return

    try {
      const [profile, preferences] = await Promise.all([
        authService.getUserProfile(state.user.id),
        authService.getUserPreferences(state.user.id)
      ])

      setState(prev => ({
        ...prev,
        profile,
        preferences,
      }))
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du profil:', error)
    }
  }

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const { user, error } = await authService.signIn(credentials)

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }))
        return { success: false, error: error.message }
      }

      if (user) {
        await loadUserData(user)
        router.push('/dashboard')
        return { success: true }
      }

      return { success: false, error: 'Erreur inconnue' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const signUp = async (data: RegisterData) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const { user, error } = await authService.signUp(data)

      if (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }))
        return { success: false, error: error.message }
      }

      if (user) {
        router.push('/auth/verify-email')
        return { success: true }
      }

      return { success: false, error: 'Erreur inconnue' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'inscription'
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }))

      await authService.signOut()

      setState({
        user: null,
        profile: null,
        preferences: null,
        session: null,
        loading: false,
        error: null,
      })

      router.push('/auth/login')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const resetPassword = async (data: ResetPasswordData) => {
    try {
      const { error } = await authService.resetPassword(data)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de récupération'
      return { success: false, error: errorMessage }
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await authService.updatePassword(newPassword)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de mise à jour'
      return { success: false, error: errorMessage }
    }
  }

  const updateProfile = async (updates: UpdateProfileData) => {
    try {
      const { error } = await authService.updateProfile(updates)

      if (error) {
        return { success: false, error: error.message }
      }

      await refreshProfile()
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de mise à jour'
      return { success: false, error: errorMessage }
    }
  }

  const updatePreferences = async (updates: UpdatePreferencesData) => {
    try {
      const { error } = await authService.updatePreferences(updates)

      if (error) {
        return { success: false, error: error.message }
      }

      await refreshProfile()
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de mise à jour'
      return { success: false, error: errorMessage }
    }
  }

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setState(prev => ({ ...prev, session }))
          await loadUserData(session.user)
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de la session:', error)
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erreur d\'initialisation' 
        }))
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)

        setState(prev => ({ ...prev, session }))

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserData(session.user)
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            preferences: null,
            session: null,
            loading: false,
            error: null,
          })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setState(prev => ({ ...prev, session, user: session.user }))
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const isAdmin = state.profile?.role === 'admin'

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    updatePreferences,
    refreshProfile,
    isAdmin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  return { user, loading }
}

export function useRequireAdmin() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (profile && profile.role !== 'admin') {
        router.push('/unauthorized')
      }
    }
  }, [user, profile, loading, router])

  return { user, profile, loading }
}

export function useUserPreferences() {
  const { preferences, updatePreferences } = useAuth()

  const updateTheme = async (theme: 'light' | 'dark' | 'system') => {
    return await updatePreferences({ theme })
  }

  const updateLanguage = async (language: 'fr' | 'en') => {
    return await updatePreferences({ language })
  }

  const toggleAIPredictions = async () => {
    return await updatePreferences({ 
      enable_ai_predictions: !preferences?.enable_ai_predictions 
    })
  }

  return {
    preferences,
    updatePreferences,
    updateTheme,
    updateLanguage,
    toggleAIPredictions,
  }
}
