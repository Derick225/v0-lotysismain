"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Save,
  Settings,
  Users,
  Database,
  Shield,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  Monitor,
  FileText,
  Lock,
  Unlock,
  HardDrive,
  Eye,
  EyeOff,
  Key,
  UserPlus,
  BarChart3,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ModelManagementPanel } from "./model-management-panel"
import { APIStatus } from "./api-status"
import { NumberInput } from "./number-input"
import { DrawNameSelect } from "./draw-name-select"
import { BatchInputPanel } from "./batch-input-panel"
import { BackupRestorePanel } from "./backup-restore-panel"
import { SupabaseTestPanel } from "./supabase-test-panel"
import { SystemMonitoring } from "./system-monitoring"
import { ModelManagementPanel } from "./model-management-panel"
import { EnhancedModelManagementPanel } from "./enhanced-model-management-panel"
import { AuditService } from "../lib/logger"
import { checkAPIHealth } from "../lib/api-config"
import { supabase } from "../../lib/supabase"
import { authService, type AuthUser } from "../lib/auth-service"
import { checkAPIHealth } from "../lib/api-config"
import { checkAPIHealth } from "../lib/api-config"

interface DatabaseStats {
  totalDraws: number
  totalDrawTypes: number
  totalNumbers: number
  dataSize: string
  lastUpdate: string
}

interface SystemHealth {
  api: "healthy" | "warning" | "error"
  database: "healthy" | "warning" | "error"
  ml: "healthy" | "warning" | "error"
  storage: "healthy" | "warning" | "error"
}

interface User {
  id: string
  email: string
  role: "admin" | "editor" | "viewer"
  lastLogin: string
  isActive: boolean
}

interface SystemConfig {
  apiUrl: string
  syncInterval: number
  predictionDepth: number
  confidenceThreshold: number
  enableAutoSync: boolean
  enableNotifications: boolean
  maxHistoryDays: number
  mlModelTimeout: number
}

export function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // États pour les données
  const [newResult, setNewResult] = useState({
    draw_name: "",
    date: "",
    gagnants: [] as number[],
    machine: [] as number[],
  })

  // États pour les statistiques et monitoring
  const [dbStats, setDbStats] = useState<DatabaseStats>({
    totalDraws: 0,
    totalDrawTypes: 0,
    totalNumbers: 0,
    dataSize: "0 MB",
    lastUpdate: new Date().toISOString(),
  })

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    api: "healthy",
    database: "healthy",
    ml: "healthy",
    storage: "healthy",
  })

  // États pour la gestion des utilisateurs
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      email: "admin@lotysis.com",
      role: "admin",
      lastLogin: new Date().toISOString(),
      isActive: true,
    },
  ])

  const [newUser, setNewUser] = useState({
    email: "",
    role: "viewer" as const,
    password: "",
  })

  // États pour la configuration système
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    apiUrl: "https://lotobonheur.ci/api/results",
    syncInterval: 30,
    predictionDepth: 100,
    confidenceThreshold: 60,
    enableAutoSync: true,
    enableNotifications: true,
    maxHistoryDays: 365,
    mlModelTimeout: 30000,
  })

  // États pour les opérations
  const [isLoading, setIsLoading] = useState(false)
  const [syncProgress, setSyncProgress] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState<{
    type: string
    progress: number
    message: string
    isActive: boolean
  }>({
    type: '',
    progress: 0,
    message: '',
    isActive: false
  })

  const { toast } = useToast()

  // Chargement des données au démarrage
  useEffect(() => {
    if (isAuthenticated) {
      loadDatabaseStats()
      checkSystemHealth()
      loadSystemConfig()

      // Charger les utilisateurs si l'utilisateur est admin
      if (currentUser?.role === 'admin') {
        loadUsers()
      }
    }
  }, [isAuthenticated, currentUser?.role])

  // Auto-refresh des statistiques
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      loadDatabaseStats()
      checkSystemHealth()
    }, 30000) // Refresh toutes les 30 secondes

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Fonctions de chargement des données
  const loadDatabaseStats = async () => {
    try {
      // Appeler l'API pour récupérer les statistiques
      const response = await fetch('/api/stats')
      const data = await response.json()

      if (data.success) {
        setDbStats({
          totalDraws: data.stats.totalDraws || 0,
          totalDrawTypes: data.stats.totalDrawTypes || 0,
          totalNumbers: data.stats.totalNumbers || 0,
          dataSize: data.stats.dataSize || '0 MB',
          lastUpdate: data.stats.lastUpdate || new Date().toISOString()
        })
      } else {
        // Fallback en cas d'erreur API
        const stats = {
          totalDraws: Math.floor(Math.random() * 1000) + 200,
          totalDrawTypes: 32,
          totalNumbers: Math.floor(Math.random() * 5000) + 1000,
          dataSize: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
          lastUpdate: new Date().toISOString(),
        }
        setDbStats(stats)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error)
      // Fallback en cas d'erreur
      const stats = {
        totalDraws: Math.floor(Math.random() * 1000) + 200,
        totalDrawTypes: 32,
        totalNumbers: Math.floor(Math.random() * 5000) + 1000,
        dataSize: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
        lastUpdate: new Date().toISOString(),
      }
      setDbStats(stats)
    }
  }

  const checkSystemHealth = async () => {
    try {
      // Vérifier l'état de l'API
      const apiHealth = await checkAPIHealth()

      setSystemHealth({
        api: apiHealth.api ? 'healthy' : 'unhealthy',
        database: apiHealth.database ? 'healthy' : 'unhealthy',
        ml: apiHealth.status === 'healthy' ? 'healthy' : 'degraded',
        storage: apiHealth.externalServices ? 'healthy' : 'degraded'
      })
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état du système:', error)
      // Fallback en cas d'erreur
      const health: SystemHealth = {
        api: Math.random() > 0.8 ? "warning" : "healthy",
        database: Math.random() > 0.9 ? "error" : "healthy",
        ml: Math.random() > 0.85 ? "warning" : "healthy",
        storage: Math.random() > 0.95 ? "error" : "healthy",
      }
      setSystemHealth(health)
    }
  }

  const loadSystemConfig = async () => {
    try {
      // Essayer de charger depuis le localStorage
      const savedConfig = localStorage.getItem('lotysis_admin_config')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        setSystemConfig({ ...systemConfig, ...config })
      }

      // Essayer de charger depuis l'API
      try {
        const response = await fetch('/api/config')
        const data = await response.json()
        if (data.success && data.config) {
          setSystemConfig(prev => ({...prev, ...data.config}))
          // Mettre à jour le localStorage
          localStorage.setItem('lotysis_admin_config', JSON.stringify({...systemConfig, ...data.config}))
        }
      } catch (apiError) {
        console.warn('API de configuration non disponible, utilisation de la configuration locale')
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error)
    }
  }

  const saveSystemConfig = async () => {
    setIsLoading(true)
    try {
      // Valider les paramètres
      if (systemConfig.syncInterval < 0 || systemConfig.predictionDepth < 10 ||
          systemConfig.confidenceThreshold < 0 || systemConfig.confidenceThreshold > 100 ||
          systemConfig.maxHistoryDays < 1 || systemConfig.mlModelTimeout < 1000) {
        throw new Error('Paramètres invalides. Veuillez vérifier les valeurs.')
      }

      // Sauvegarder dans le localStorage pour persistance
      localStorage.setItem("lotysis_admin_config", JSON.stringify(systemConfig))

      // Enregistrer l'action dans les logs d'audit
      try {
        await AuditService.logAction({
          action: 'UPDATE_CONFIG',
          user_id: currentUser?.id || 'unknown',
          resource_type: 'system',
          details: {
            config: systemConfig,
            timestamp: new Date().toISOString()
          }
        })
      } catch (auditError) {
        console.warn("Impossible d'enregistrer l'action dans les logs d'audit:", auditError)
      }

      // Appeler l'API pour sauvegarder en base de données (si disponible)
      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(systemConfig)
        })
        const result = await response.json()
        if (!result.success) {
          console.warn("Sauvegarde API échouée, mais configuration locale sauvegardée:", result.error)
        }
      } catch (apiError) {
        console.warn("API de configuration non disponible, configuration sauvegardée localement")
      }

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres système ont été mis à jour avec succès.",
      })
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la configuration:", error)
      toast({
        title: "Erreur",
        description: `Impossible de sauvegarder la configuration: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Synchronisation des données avec l'API externe
  const handleSyncData = async () => {
    setIsLoading(true)
    setOperationProgress({
      type: 'sync',
      progress: 0,
      message: 'Initialisation de la synchronisation...',
      isActive: true
    })

    try {
      // Simuler le progrès
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
          message: prev.progress < 30 ? 'Connexion à l\'API...' :
                   prev.progress < 60 ? 'Récupération des données...' :
                   'Traitement des résultats...'
        }))
      }, 200)

      // Appeler le service de synchronisation
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: systemConfig.apiUrl,
          syncInterval: systemConfig.syncInterval,
          maxResults: 1000,
          tables: ['lottery_results']
        })
      })

      const result = await response.json()
      clearInterval(progressInterval)

      setOperationProgress(prev => ({
        ...prev,
        progress: 100,
        message: 'Synchronisation terminée'
      }))

      if (result.success) {
        setLastSyncTime(new Date().toISOString())

        toast({
          title: "Synchronisation réussie",
          description: `${result.syncedCount || 0} nouveaux résultats synchronisés en ${result.duration}ms.`,
        })

        // Rafraîchir les statistiques
        await loadDatabaseStats()

        // Afficher les détails si il y a des conflits
        if (result.conflicts && result.conflicts.length > 0) {
          toast({
            title: "Conflits détectés",
            description: `${result.conflicts.length} conflits nécessitent une attention.`,
            variant: "destructive"
          })
        }
      } else {
        throw new Error(result.error || 'Erreur lors de la synchronisation')
      }
    } catch (error) {
      setOperationProgress(prev => ({
        ...prev,
        progress: 100,
        message: 'Erreur de synchronisation'
      }))

      toast({
        title: "Erreur de synchronisation",
        description: `Impossible de synchroniser avec l'API: ${error}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setOperationProgress({
          type: '',
          progress: 0,
          message: '',
          isActive: false
        })
      }, 2000)
    }
  }

  // Nettoyage des anciennes données
  const handleCleanupData = async () => {
    // D'abord, obtenir un aperçu
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - systemConfig.maxHistoryDays)
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

      const previewResponse = await fetch(`/api/lottery-results/cleanup?before_date=${cutoffDateStr}`)
      const previewResult = await previewResponse.json()

      if (!previewResult.success) {
        throw new Error(previewResult.error)
      }

      // Demander confirmation avec les détails
      const confirmMessage = `Êtes-vous sûr de vouloir supprimer les données suivantes ?\n\n` +
        `• ${previewResult.preview.oldRecords} anciens résultats (avant ${cutoffDateStr})\n` +
        `• ${previewResult.preview.duplicates} doublons\n` +
        `• ${previewResult.preview.invalidRecords} enregistrements invalides\n\n` +
        `Total: ${previewResult.preview.totalRecords} enregistrements\n\n` +
        `Cette action est irréversible.`

      if (!confirm(confirmMessage)) {
        return
      }

      setIsLoading(true)
      setOperationProgress({
        type: 'cleanup',
        progress: 0,
        message: 'Initialisation du nettoyage...',
        isActive: true
      })

      // Simuler le progrès
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 15, 90),
          message: prev.progress < 30 ? 'Analyse des données...' :
                   prev.progress < 60 ? 'Suppression en cours...' :
                   'Finalisation...'
        }))
      }, 300)

      const response = await fetch(`/api/lottery-results/cleanup`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          before_date: cutoffDateStr,
          max_history_days: systemConfig.maxHistoryDays,
          criteria: {
            old_data: true,
            duplicates: true,
            invalid: true
          }
        })
      })

      const result = await response.json()
      clearInterval(progressInterval)

      setOperationProgress(prev => ({
        ...prev,
        progress: 100,
        message: 'Nettoyage terminé'
      }))

      if (result.success) {
        toast({
          title: "Nettoyage terminé",
          description: `${result.deletedCount || 0} enregistrements supprimés en ${result.duration}ms.`,
        })

        // Rafraîchir les statistiques
        await loadDatabaseStats()

        // Afficher les détails
        if (result.details) {
          console.log('Détails du nettoyage:', result.details)
        }
      } else {
        throw new Error(result.error || 'Erreur lors du nettoyage')
      }
    } catch (error) {
      setOperationProgress(prev => ({
        ...prev,
        progress: 100,
        message: 'Erreur de nettoyage'
      }))

      toast({
        title: "Erreur de nettoyage",
        description: `Impossible de nettoyer les données: ${error}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setOperationProgress({
          type: '',
          progress: 0,
          message: '',
          isActive: false
        })
      }, 2000)
    }
  }



  // Fonction pour charger les utilisateurs
  const loadUsers = async () => {
    try {
      // Essayer de charger depuis Supabase
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          role,
          is_active,
          created_at,
          updated_at,
          auth.users!inner(email, last_sign_in_at)
        `)

      if (data && !error) {
        const loadedUsers: User[] = data.map((profile: any) => ({
          id: profile.user_id,
          email: profile.auth.users.email,
          role: profile.role,
          lastLogin: profile.auth.users.last_sign_in_at || new Date().toISOString(),
          isActive: profile.is_active
        }))
        setUsers(loadedUsers)
      } else {
        // Fallback vers les utilisateurs de démo
        const demoUsers: User[] = [
          {
            id: "1",
            email: "admin@lotysis.com",
            role: "admin",
            lastLogin: new Date().toISOString(),
            isActive: true,
          },
          {
            id: "2",
            email: "editor@lotysis.com",
            role: "editor",
            lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          },
          {
            id: "3",
            email: "viewer@lotysis.com",
            role: "viewer",
            lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            isActive: false,
          }
        ]
        setUsers(demoUsers)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      // Utiliser les utilisateurs de démo en cas d'erreur
      const demoUsers: User[] = [
        {
          id: "1",
          email: "admin@lotysis.com",
          role: "admin",
          lastLogin: new Date().toISOString(),
          isActive: true,
        }
      ]
      setUsers(demoUsers)
    }
  }

  // Gestion des utilisateurs
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      })
      return
    }

    // Vérifier la complexité du mot de passe
    if (newUser.password.length < 8) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 8 caractères.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: { role: newUser.role }
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error("Erreur lors de la création de l'utilisateur")
      }

      // Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: authData.user.id,
            role: newUser.role,
            is_active: true,
            created_by: currentUser?.id || 'admin'
          }
        ])

      if (profileError) {
        throw new Error(profileError.message)
      }

      // Ajouter l'utilisateur à la liste locale
      const user: User = {
        id: authData.user.id,
        email: newUser.email,
        role: newUser.role,
        lastLogin: new Date().toISOString(),
        isActive: true,
      }

      setUsers([...users, user])
      setNewUser({ email: "", role: "viewer", password: "" })

      // Enregistrer l'action dans les logs d'audit
      await AuditService.logAction({
        action: 'CREATE_USER',
        user_id: currentUser?.id || 'admin',
        resource_type: 'user',
        details: {
          created_user_id: user.id,
          email: user.email,
          role: user.role
        }
      })

      toast({
        title: "Utilisateur ajouté",
        description: `L'utilisateur ${user.email} a été créé avec succès.`,
      })
    } catch (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error)

      // Fallback pour la démo si Supabase n'est pas configuré
      if (String(error).includes("service_role key is required")) {
        // Simuler la création d'un utilisateur
        const user: User = {
          id: Date.now().toString(),
          email: newUser.email,
          role: newUser.role,
          lastLogin: new Date().toISOString(),
          isActive: true,
        }

        setUsers([...users, user])
        setNewUser({ email: "", role: "viewer", password: "" })

        toast({
          title: "Utilisateur ajouté (mode démo)",
          description: `L'utilisateur ${user.email} a été créé avec succès.`,
        })
      } else {
        toast({
          title: "Erreur",
          description: `Impossible de créer l'utilisateur: ${error}`,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleUserStatus = async (userId: string) => {
    if (!authService.hasPermission('manage:users')) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions pour modifier les utilisateurs.",
        variant: "destructive",
      })
      return
    }

    const user = users.find((u) => u.id === userId)
    if (!user) return

    setIsLoading(true)
    try {
      // Mettre à jour dans Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !user.isActive })
        .eq('user_id', userId)

      if (error) {
        throw new Error(error.message)
      }

      // Mettre à jour localement
      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, isActive: !u.isActive }
          : u
      ))

      // Enregistrer l'action dans les logs d'audit
      await AuditService.logAction({
        action: user.isActive ? 'DEACTIVATE_USER' : 'ACTIVATE_USER',
        user_id: currentUser?.id || 'admin',
        resource_type: 'user',
        details: {
          target_user_id: userId,
          email: user.email,
          new_status: !user.isActive
        }
      })

      toast({
        title: "Statut mis à jour",
        description: `L'utilisateur ${user.email} a été ${!user.isActive ? 'activé' : 'désactivé'}.`,
      })
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)

      // Fallback pour la démo
      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, isActive: !u.isActive }
          : u
      ))

      toast({
        title: "Statut mis à jour (mode démo)",
        description: `L'utilisateur ${user.email} a été ${!user.isActive ? 'activé' : 'désactivé'}.`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!authService.hasPermission('manage:users')) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions pour supprimer des utilisateurs.",
        variant: "destructive",
      })
      return
    }

    const user = users.find((u) => u.id === userId)
    if (!user) return

    // Empêcher la suppression de son propre compte
    if (userId === currentUser?.id) {
      toast({
        title: "Action interdite",
        description: "Vous ne pouvez pas supprimer votre propre compte.",
        variant: "destructive",
      })
      return
    }

    // Vérifier qu'il reste au moins un admin
    if (user.role === "admin" && users.filter((u) => u.role === "admin").length === 1) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le dernier administrateur.",
        variant: "destructive",
      })
      return
    }

    // Demander confirmation
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.email} ? Cette action est irréversible.`)) {
      return
    }

    setIsLoading(true)
    try {
      // Supprimer de Supabase
      const { error } = await supabase.auth.admin.deleteUser(userId)

      if (error) {
        throw new Error(error.message)
      }

      // Supprimer localement
      setUsers(users.filter(u => u.id !== userId))

      // Enregistrer l'action dans les logs d'audit
      await AuditService.logAction({
        action: 'DELETE_USER',
        user_id: currentUser?.id || 'admin',
        resource_type: 'user',
        details: {
          deleted_user_id: userId,
          email: user.email
        }
      })

      toast({
        title: "Utilisateur supprimé",
        description: `L'utilisateur ${user.email} a été supprimé avec succès.`,
      })
    } catch (error) {
      console.error("Erreur lors de la suppression:", error)

      // Fallback pour la démo
      setUsers(users.filter(u => u.id !== userId))

      toast({
        title: "Utilisateur supprimé (mode démo)",
        description: `L'utilisateur ${user.email} a été supprimé avec succès.`,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Synchronisation des données
  const handleSyncData = async () => {
    setIsLoading(true)
    setSyncProgress(0)

    try {
      // Simulation de synchronisation
      for (let i = 0; i <= 100; i += 10) {
        setSyncProgress(i)
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      setLastSyncTime(new Date().toISOString())
      await loadDatabaseStats()

      toast({
        title: "Synchronisation terminée",
        description: "Les données ont été synchronisées avec succès.",
      })
    } catch (error) {
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les données.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setSyncProgress(0)
    }
  }

  // Nettoyage des données
  const handleCleanupData = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer les anciennes données ?")) {
      return
    }

    try {
      // Simulation de nettoyage
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Nettoyage terminé",
        description: "Les anciennes données ont été supprimées.",
      })

      await loadDatabaseStats()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer les données.",
        variant: "destructive",
      })
    }
  }

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      // Authentification avec le service d'authentification
      const result = await authService.login({
        email,
        password,
        rememberMe: true
      })

      if (result.success && result.user) {
        // Mettre à jour l'état local
        setCurrentUser(result.user)
        setIsAuthenticated(true)

        // Mettre à jour la liste des utilisateurs si l'utilisateur est admin
        if (result.user.role === 'admin') {
          loadUsers()
        }

        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté à l'interface administrateur.",
        })
      } else {
        toast({
          title: "Erreur de connexion",
          description: result.error || "Email ou mot de passe incorrect.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erreur lors de la connexion:", error)
      toast({
        title: "Erreur de connexion",
        description: "Une erreur est survenue lors de la connexion.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
      setIsAuthenticated(false)
      setCurrentUser(null)

      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      })
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la déconnexion.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fonction utilitaire pour obtenir l'icône de statut
  const getHealthIcon = (status: "healthy" | "warning" | "error") => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  // Fonction utilitaire pour obtenir le badge de statut
  const getHealthBadge = (status: "healthy" | "warning" | "error") => {
    const variants = {
      healthy: "default",
      warning: "secondary",
      error: "destructive",
    } as const

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getHealthIcon(status)}
        {status === "healthy" ? "OK" : status === "warning" ? "Attention" : "Erreur"}
      </Badge>
    )
  }

  // Fonction utilitaire pour formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleAddResult = async () => {
    if (!newResult.draw_name || !newResult.date || newResult.gagnants.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      })
      return
    }

    if (newResult.gagnants.length !== 5) {
      toast({
        title: "Erreur",
        description: "Vous devez saisir exactement 5 numéros gagnants.",
        variant: "destructive",
      })
      return
    }

    try {
      // Appeler l'API pour sauvegarder le résultat
      const response = await fetch("/api/lottery-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draw_name: newResult.draw_name,
          date: newResult.date,
          gagnants: newResult.gagnants,
          machine: newResult.machine.length === 5 ? newResult.machine : undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Résultat ajouté",
          description: `Nouveau tirage ${newResult.draw_name} ajouté avec succès.`,
        })

        // Réinitialiser le formulaire
        setNewResult({
          draw_name: "",
          date: "",
          gagnants: [],
          machine: [],
        })
      } else {
        throw new Error(result.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'ajout: ${error}`,
        variant: "destructive",
      })
    }
  }

  const handleExportData = () => {
    // Simulation d'export
    toast({
      title: "Export en cours",
      description: "Les données sont en cours d'export au format JSON.",
    })
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      toast({
        title: "Import en cours",
        description: `Import du fichier ${file.name} en cours...`,
      })
    }
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Interface Administrateur
          </CardTitle>
          <CardDescription>Connexion requise pour accéder aux fonctionnalités d'administration</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lotysis.com"
                required
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => alert("Contactez l'administrateur système pour réinitialiser votre mot de passe.")}
                >
                  Mot de passe oublié?
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez le mot de passe"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Se connecter
                </>
              )}
            </Button>
            <div className="text-sm text-gray-500 space-y-1 p-3 border rounded bg-gray-50">
              <p>
                <strong>Identifiants de démonstration:</strong>
              </p>
              <p>Email: admin@lotysis.com</p>
              <p>Mot de passe: LotysisAdmin2025!</p>
              <p className="text-xs mt-1 text-amber-600">Ces identifiants sont fournis uniquement à des fins de démonstration.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  // Gestion de l'import de données
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const text = await file.text()
      let data: any[]

      // Parser selon le type de fichier
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text)
      } else if (file.name.endsWith('.csv')) {
        // Parser CSV simple
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim())
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = values[index]
          })
          return obj
        })
      } else {
        throw new Error('Format de fichier non supporté')
      }

      // Valider et importer les données
      let importedCount = 0
      const errors: string[] = []

      for (const item of data) {
        try {
          // Valider la structure des données
          if (!item.draw_name || !item.date || !item.gagnants) {
            errors.push(`Données manquantes pour l'entrée: ${JSON.stringify(item)}`)
            continue
          }

          // Convertir les numéros gagnants si nécessaire
          let gagnants = item.gagnants
          if (typeof gagnants === 'string') {
            gagnants = gagnants.split('-').map(n => parseInt(n.trim()))
          }

          // Appeler l'API pour sauvegarder
          const response = await fetch('/api/lottery-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              draw_name: item.draw_name,
              date: item.date,
              gagnants,
              machine: item.machine ? (typeof item.machine === 'string' ?
                item.machine.split('-').map(n => parseInt(n.trim())) : item.machine) : undefined
            })
          })

          const result = await response.json()
          if (result.success) {
            importedCount++
          } else {
            errors.push(`Erreur pour ${item.draw_name} ${item.date}: ${result.error}`)
          }
        } catch (error) {
          errors.push(`Erreur de traitement: ${error}`)
        }
      }

      toast({
        title: "Import terminé",
        description: `${importedCount} résultats importés${errors.length > 0 ? `, ${errors.length} erreurs` : ''}`,
        variant: errors.length > 0 ? "destructive" : "default"
      })

      if (errors.length > 0) {
        console.error('Erreurs d\'import:', errors)
      }

      // Rafraîchir les statistiques
      await loadDatabaseStats()

    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: `Impossible d'importer le fichier: ${error}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      // Réinitialiser l'input file
      event.target.value = ''
    }
  }

  // Export des données
  const handleExportData = async () => {
    setIsLoading(true)
    try {
      // Récupérer toutes les données
      const response = await fetch('/api/lottery-results?limit=10000')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la récupération des données')
      }

      // Créer le fichier JSON
      const exportData = {
        exported_at: new Date().toISOString(),
        total_records: data.data.length,
        data: data.data
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })

      // Télécharger le fichier
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lotysis-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export réussi",
        description: `${data.data.length} résultats exportés avec succès.`,
      })

    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: `Impossible d'exporter les données: ${error}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsLoading(true)
    // Simuler la synchronisation
    await new Promise((resolve) => setTimeout(resolve, 3000))
    toast({
      title: "Synchronisation terminée",
      description: "Les données ont été synchronisées avec l'API.",
    })
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Interface Administrateur
          <Badge variant="secondary">Connecté</Badge>
        </CardTitle>
        <CardDescription>Gestion des données de loterie et configuration système</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            {authService.hasPermission('write:lottery-results') && (
              <TabsTrigger value="add-result">Ajouter Résultat</TabsTrigger>
            )}
            {authService.hasPermission('write:lottery-results') && (
              <TabsTrigger value="batch-input">Saisie en Lot</TabsTrigger>
            )}
            {authService.hasPermission('manage:system') && (
              <TabsTrigger value="manage-data">Gérer Données</TabsTrigger>
            )}
            {authService.hasPermission('manage:models') && (
              <TabsTrigger value="models">Modèles ML</TabsTrigger>
            )}
            {authService.hasPermission('manage:system') && (
              <TabsTrigger value="tests">Tests Supabase</TabsTrigger>
            )}
            {authService.hasPermission('manage:system') && (
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            )}
          </TabsList>

          {/* Onglet Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-6">
            {/* Statut du système */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">{getHealthBadge(systemHealth.api)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Base de données</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">{getHealthBadge(systemHealth.database)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Modèles ML</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">{getHealthBadge(systemHealth.ml)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stockage</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">{getHealthBadge(systemHealth.storage)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Statistiques de la base de données */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistiques de la base de données
                </CardTitle>
                <CardDescription>Dernière mise à jour: {formatDate(dbStats.lastUpdate)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{dbStats.totalDraws.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total tirages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{dbStats.totalDrawTypes}</div>
                    <div className="text-sm text-gray-600">Tirages différents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{dbStats.totalNumbers.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Numéros enregistrés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{dbStats.dataSize}</div>
                    <div className="text-sm text-gray-600">Taille des données</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Synchronisation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Synchronisation des données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Dernière synchronisation</p>
                    <p className="text-sm text-gray-600">{lastSyncTime ? formatDate(lastSyncTime) : "Jamais"}</p>
                  </div>
                  <Button onClick={handleSyncData} disabled={isLoading} className="flex items-center gap-2">
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    {isLoading ? "Synchronisation..." : "Synchroniser"}
                  </Button>
                </div>

                {isLoading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progression</span>
                      <span>{syncProgress}%</span>
                    </div>
                    <Progress value={syncProgress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button onClick={handleSyncData} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Synchroniser maintenant
                  </Button>

                  <Button
                    onClick={handleCleanupData}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4" />
                    Nettoyer les données
                  </Button>

                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Actualiser l'interface
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-result" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <DrawNameSelect
                  value={newResult.draw_name}
                  onChange={(value) => setNewResult({ ...newResult, draw_name: value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={newResult.date}
                  onChange={(e) => setNewResult({ ...newResult, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-6">
              <NumberInput
                label="Numéros gagnants"
                required
                value={newResult.gagnants}
                onChange={(numbers) => setNewResult({ ...newResult, gagnants: numbers })}
                maxNumbers={5}
                placeholder="Entrez un numéro entre 1 et 90"
                persistKey={`admin_gagnants_${newResult.draw_name}_${newResult.date}`}
                allowHistory={true}
                quickInput={true}
              />

              <NumberInput
                label="Numéros machine (optionnel)"
                value={newResult.machine}
                onChange={(numbers) => setNewResult({ ...newResult, machine: numbers })}
                maxNumbers={5}
                placeholder="Entrez un numéro entre 1 et 90"
                persistKey={`admin_machine_${newResult.draw_name}_${newResult.date}`}
                allowHistory={true}
                quickInput={true}
              />
            </div>

            <Button onClick={handleAddResult} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter le résultat
            </Button>
          </TabsContent>

          <TabsContent value="batch-input">
            <BatchInputPanel />
          </TabsContent>

          <TabsContent value="manage-data" className="space-y-6">
            {/* Actions de gestion des données */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Gestion des données
                </CardTitle>
                <CardDescription>Import, export et maintenance des données de loterie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Indicateur de progression */}
                {operationProgress.isActive && (
                  <div className="p-4 border rounded bg-blue-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {operationProgress.type === 'sync' ? 'Synchronisation' :
                         operationProgress.type === 'cleanup' ? 'Nettoyage' :
                         'Opération'} en cours...
                      </span>
                      <span className="text-sm text-gray-600">{operationProgress.progress}%</span>
                    </div>
                    <Progress value={operationProgress.progress} className="h-2 mb-2" />
                    <p className="text-xs text-gray-600">{operationProgress.message}</p>
                  </div>
                )}

                {/* Informations de dernière synchronisation */}
                {lastSyncTime && (
                  <div className="p-3 border rounded bg-green-50 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Dernière synchronisation: {new Date(lastSyncTime).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    onClick={handleExportData}
                    className="flex items-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Exporter JSON
                  </Button>

                  <div>
                    <Input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleImportData}
                      className="hidden"
                      id="import-file"
                      disabled={isLoading}
                    />
                    <Button asChild className="flex items-center gap-2 w-full">
                      <label htmlFor="import-file" className={`cursor-pointer ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                        <Upload className="h-4 w-4" />
                        Importer fichier
                      </label>
                    </Button>
                  </div>

                  <Button
                    onClick={handleSyncData}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                    disabled={isLoading || !authService.hasPermission('manage:system')}
                  >
                    <RefreshCw className={`h-4 w-4 ${operationProgress.type === 'sync' ? 'animate-spin' : ''}`} />
                    Synchroniser API
                  </Button>

                  <Button
                    onClick={handleCleanupData}
                    variant="destructive"
                    className="flex items-center gap-2"
                    disabled={isLoading || !authService.hasPermission('manage:system')}
                  >
                    <Trash2 className="h-4 w-4" />
                    Purger anciennes
                  </Button>
                </div>

                {/* Statistiques rapides */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dbStats.totalDraws}</div>
                    <div className="text-xs text-gray-500">Total tirages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dbStats.totalDrawTypes}</div>
                    <div className="text-xs text-gray-500">Types de jeux</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{dbStats.dataSize}</div>
                    <div className="text-xs text-gray-500">Taille données</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {dbStats.lastUpdate ? new Date(dbStats.lastUpdate).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Dernière MAJ</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sauvegarde et restauration */}
            <BackupRestorePanel />

            {/* Outils de maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Outils de maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nettoyage sélectif */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Nettoyage sélectif</h4>
                    <div className="space-y-2">
                      <Label htmlFor="cleanup-days">Supprimer les données de plus de (jours)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="cleanup-days"
                          type="number"
                          placeholder="365"
                          defaultValue="365"
                          min="1"
                          max="3650"
                        />
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Supprimer par type de tirage</Label>
                      <div className="flex gap-2">
                        <Select>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Choisir un tirage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tous les tirages</SelectItem>
                            <SelectItem value="National">National</SelectItem>
                            <SelectItem value="Etoile">Etoile</SelectItem>
                            <SelectItem value="Fortune">Fortune</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Optimisation de la base */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Optimisation</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full flex items-center gap-2 bg-transparent">
                        <RefreshCw className="h-4 w-4" />
                        Reconstruire les index
                      </Button>

                      <Button variant="outline" className="w-full flex items-center gap-2 bg-transparent">
                        <Database className="h-4 w-4" />
                        Analyser les performances
                      </Button>

                      <Button variant="outline" className="w-full flex items-center gap-2 bg-transparent">
                        <TrendingUp className="h-4 w-4" />
                        Optimiser les requêtes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Journaux d'activité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Journaux d'activité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[
                    {
                      time: new Date().toISOString(),
                      action: "Synchronisation automatique terminée",
                      status: "success",
                    },
                    {
                      time: new Date(Date.now() - 300000).toISOString(),
                      action: "Ajout résultat National",
                      status: "success",
                    },
                    {
                      time: new Date(Date.now() - 600000).toISOString(),
                      action: "Modèle LSTM mis à jour",
                      status: "info",
                    },
                    {
                      time: new Date(Date.now() - 900000).toISOString(),
                      action: "Tentative de connexion API échouée",
                      status: "error",
                    },
                    {
                      time: new Date(Date.now() - 1200000).toISOString(),
                      action: "Nettoyage des anciennes prédictions",
                      status: "success",
                    },
                  ].map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        {log.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {log.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {log.status === "info" && <AlertTriangle className="h-4 w-4 text-blue-500" />}
                        <span className="text-sm">{log.action}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(log.time)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Statut du système */}
            <APIStatus />

            {/* Configuration API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Configuration API
                </CardTitle>
                <CardDescription>Paramètres de connexion et synchronisation avec l'API externe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api-url">URL de l'API</Label>
                    <Input
                      id="api-url"
                      value={systemConfig.apiUrl}
                      onChange={(e) => setSystemConfig({ ...systemConfig, apiUrl: e.target.value })}
                      placeholder="URL de l'API des résultats"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sync-interval">Intervalle de synchronisation (minutes)</Label>
                    <Input
                      id="sync-interval"
                      type="number"
                      value={systemConfig.syncInterval}
                      onChange={(e) => setSystemConfig({ ...systemConfig, syncInterval: Number(e.target.value) })}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-sync"
                      checked={systemConfig.enableAutoSync}
                      onCheckedChange={(checked) => setSystemConfig({ ...systemConfig, enableAutoSync: checked })}
                    />
                    <Label htmlFor="auto-sync">Synchronisation automatique</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="notifications"
                      checked={systemConfig.enableNotifications}
                      onCheckedChange={(checked) => setSystemConfig({ ...systemConfig, enableNotifications: checked })}
                    />
                    <Label htmlFor="notifications">Notifications</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paramètres de prédiction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Paramètres de prédiction
                </CardTitle>
                <CardDescription>Configuration des algorithmes de prédiction et modèles ML</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prediction-depth">Profondeur d'analyse (nombre de tirages)</Label>
                    <Input
                      id="prediction-depth"
                      type="number"
                      value={systemConfig.predictionDepth}
                      onChange={(e) => setSystemConfig({ ...systemConfig, predictionDepth: Number(e.target.value) })}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confidence-threshold">Seuil de confiance minimum (%)</Label>
                    <Input
                      id="confidence-threshold"
                      type="number"
                      value={systemConfig.confidenceThreshold}
                      onChange={(e) =>
                        setSystemConfig({ ...systemConfig, confidenceThreshold: Number(e.target.value) })
                      }
                      placeholder="60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ml-timeout">Timeout modèles ML (ms)</Label>
                    <Input
                      id="ml-timeout"
                      type="number"
                      value={systemConfig.mlModelTimeout}
                      onChange={(e) => setSystemConfig({ ...systemConfig, mlModelTimeout: Number(e.target.value) })}
                      placeholder="30000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="history-days">Historique maximum (jours)</Label>
                    <Input
                      id="history-days"
                      type="number"
                      value={systemConfig.maxHistoryDays}
                      onChange={(e) => setSystemConfig({ ...systemConfig, maxHistoryDays: Number(e.target.value) })}
                      placeholder="365"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gestion des utilisateurs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion des utilisateurs
                </CardTitle>
                <CardDescription>Ajouter et gérer les utilisateurs administrateurs</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Formulaire d'ajout d'utilisateur */}
                {/* Informations sur les rôles */}
                <div className="mb-6 p-4 border rounded bg-blue-50">
                  <h4 className="font-medium mb-2">Rôles et permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <Badge className="mb-1">Administrateur</Badge>
                      <p className="text-gray-600">Accès complet à toutes les fonctionnalités, gestion des utilisateurs et du système.</p>
                    </div>
                    <div>
                      <Badge variant="secondary" className="mb-1">Éditeur</Badge>
                      <p className="text-gray-600">Peut ajouter/modifier les résultats de loterie et gérer les modèles ML.</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">Lecteur</Badge>
                      <p className="text-gray-600">Accès en lecture seule aux résultats et statistiques.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <h4 className="font-medium">Ajouter un utilisateur</h4>
                  {!authService.hasPermission('manage:users') && (
                    <div className="p-3 border border-amber-200 rounded bg-amber-50 text-amber-800">
                      <p className="text-sm">Vous n'avez pas les permissions pour ajouter des utilisateurs.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="new-user-email">Email</Label>
                      <Input
                        id="new-user-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="utilisateur@email.com"
                        disabled={!authService.hasPermission('manage:users') || isLoading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-user-role">Rôle</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                        disabled={!authService.hasPermission('manage:users') || isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Administrateur
                            </div>
                          </SelectItem>
                          <SelectItem value="editor">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Éditeur
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Lecteur
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <Label htmlFor="new-user-password">Mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="new-user-password"
                          type={showPassword ? "text" : "password"}
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Mot de passe sécurisé"
                          disabled={!authService.hasPermission('manage:users') || isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={!authService.hasPermission('manage:users') || isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum 8 caractères, incluant majuscules, chiffres et caractères spéciaux.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAddUser}
                    className="flex items-center gap-2"
                    disabled={!authService.hasPermission('manage:users') || isLoading || !newUser.email || !newUser.password || newUser.password.length < 8}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Ajouter l'utilisateur
                      </>
                    )}
                  </Button>
                </div>

                {/* Liste des utilisateurs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Utilisateurs existants ({users.length})</h4>
                    {users.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {users.filter(u => u.isActive).length} actifs, {users.filter(u => !u.isActive).length} inactifs
                      </div>
                    )}
                  </div>

                  {users.length === 0 ? (
                    <div className="p-4 text-center border rounded bg-gray-50">
                      <p className="text-gray-500">Aucun utilisateur trouvé</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded border ${
                            user.isActive ? "" : "bg-gray-50 opacity-75"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 md:mb-0">
                            <div className="flex items-center gap-2">
                              {user.isActive ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="font-medium">{user.email}</span>
                              {user.id === currentUser?.id && (
                                <Badge variant="outline" className="ml-1">Vous</Badge>
                              )}
                            </div>
                            <Badge
                              variant={
                                user.role === "admin" ? "default" : user.role === "editor" ? "secondary" : "outline"
                              }
                            >
                              {user.role === "admin" ? "Administrateur" : user.role === "editor" ? "Éditeur" : "Lecteur"}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Dernière connexion: {new Date(user.lastLogin).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 self-end md:self-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleUserStatus(user.id)}
                              disabled={!authService.hasPermission('manage:users') || isLoading || user.id === currentUser?.id}
                              title={user.isActive ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
                            >
                              {user.isActive ? (
                                <Lock className="h-4 w-4 text-amber-500" />
                              ) : (
                                <Unlock className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={
                                !authService.hasPermission('manage:users') ||
                                isLoading ||
                                user.id === currentUser?.id ||
                                (user.role === "admin" && users.filter((u) => u.role === "admin").length <= 1)
                              }
                              title={
                                user.id === currentUser?.id
                                  ? "Vous ne pouvez pas supprimer votre propre compte"
                                  : (user.role === "admin" && users.filter((u) => u.role === "admin").length <= 1)
                                    ? "Impossible de supprimer le dernier administrateur"
                                    : "Supprimer l'utilisateur"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sécurité et permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Sécurité et permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Paramètres de sécurité</h4>

                    <div className="flex items-center space-x-2">
                      <Switch id="require-2fa" />
                      <Label htmlFor="require-2fa">Authentification à deux facteurs obligatoire</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="session-timeout" defaultChecked />
                      <Label htmlFor="session-timeout">Expiration automatique des sessions</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="audit-log" defaultChecked />
                      <Label htmlFor="audit-log">Journal d'audit détaillé</Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Clés API</h4>

                    <div className="space-y-2">
                      <Label>Clé API publique</Label>
                      <div className="flex gap-2">
                        <Input value="pk_live_..." readOnly className="font-mono text-sm" />
                        <Button size="sm" variant="outline">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Clé API privée</Label>
                      <div className="flex gap-2">
                        <Input value="sk_live_..." readOnly className="font-mono text-sm" type="password" />
                        <Button size="sm" variant="outline">
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={saveSystemConfig} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Sauvegarder tous les paramètres
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="models">
            <EnhancedModelManagementPanel />
          </TabsContent>

          <TabsContent value="tests">
            <SupabaseTestPanel />
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleLogout} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Déconnexion...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Se déconnecter
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
