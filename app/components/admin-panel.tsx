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

  const { toast } = useToast()

  // Chargement des données au démarrage
  useEffect(() => {
    if (isAuthenticated) {
      loadDatabaseStats()
      checkSystemHealth()
      loadSystemConfig()
    }
  }, [isAuthenticated])

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
      // Simulation de chargement des statistiques depuis l'API
      const stats = {
        totalDraws: Math.floor(Math.random() * 1000) + 200,
        totalDrawTypes: 32,
        totalNumbers: Math.floor(Math.random() * 5000) + 1000,
        dataSize: `${(Math.random() * 10 + 1).toFixed(1)} MB`,
        lastUpdate: new Date().toISOString(),
      }
      setDbStats(stats)
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error)
    }
  }

  const checkSystemHealth = async () => {
    try {
      // Simulation de vérification de l'état du système
      const health: SystemHealth = {
        api: Math.random() > 0.8 ? "warning" : "healthy",
        database: Math.random() > 0.9 ? "error" : "healthy",
        ml: Math.random() > 0.85 ? "warning" : "healthy",
        storage: Math.random() > 0.95 ? "error" : "healthy",
      }
      setSystemHealth(health)
    } catch (error) {
      console.error("Erreur lors de la vérification système:", error)
    }
  }

  const loadSystemConfig = () => {
    // Charger la configuration depuis localStorage ou API
    const savedConfig = localStorage.getItem("lotysis_admin_config")
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setSystemConfig({ ...systemConfig, ...config })
      } catch (error) {
        console.error("Erreur lors du chargement de la configuration:", error)
      }
    }
  }

  const saveSystemConfig = async () => {
    try {
      // Sauvegarder la configuration
      localStorage.setItem("lotysis_admin_config", JSON.stringify(systemConfig))

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres système ont été mis à jour avec succès.",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      })
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
      title: "Utilisateur ajouté",
      description: `L'utilisateur ${user.email} a été créé avec succès.`,
    })
  }

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map((user) => (user.id === userId ? { ...user, isActive: !user.isActive } : user)))

    const user = users.find((u) => u.id === userId)
    toast({
      title: "Statut utilisateur modifié",
      description: `L'utilisateur ${user?.email} a été ${user?.isActive ? "désactivé" : "activé"}.`,
    })
  }

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user?.role === "admin" && users.filter((u) => u.role === "admin").length === 1) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le dernier administrateur.",
        variant: "destructive",
      })
      return
    }

    setUsers(users.filter((u) => u.id !== userId))
    toast({
      title: "Utilisateur supprimé",
      description: `L'utilisateur ${user?.email} a été supprimé.`,
    })
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

  const handleLogin = () => {
    // Authentification avec email et mot de passe
    if (email === "admin@lotysis.com" && password === "LotysisAdmin2025!") {
      const user = users.find((u) => u.email === email)
      setCurrentUser(user || users[0])
      setIsAuthenticated(true)
      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté à l'interface administrateur.",
      })
    } else {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect.",
        variant: "destructive",
      })
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
          <CardTitle>Interface Administrateur</CardTitle>
          <CardDescription>Connexion requise pour accéder aux fonctionnalités d'administration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lotysis.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Se connecter
            </Button>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                <strong>Identifiants de démonstration:</strong>
              </p>
              <p>Email: admin@lotysis.com</p>
              <p>Mot de passe: LotysisAdmin2025!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleDataImport = async () => {
    setIsLoading(true)
    // Simuler l'import de données
    await new Promise((resolve) => setTimeout(resolve, 2000))
    toast({
      title: "Import réussi",
      description: "Les données ont été importées avec succès.",
    })
    setIsLoading(false)
  }

  const handleDataExport = async () => {
    setIsLoading(true)
    // Simuler l'export de données
    await new Promise((resolve) => setTimeout(resolve, 1500))
    toast({
      title: "Export réussi",
      description: "Les données ont été exportées avec succès.",
    })
    setIsLoading(false)
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="add-result">Ajouter Résultat</TabsTrigger>
            <TabsTrigger value="batch-input">Saisie en Lot</TabsTrigger>
            <TabsTrigger value="manage-data">Gérer Données</TabsTrigger>
            <TabsTrigger value="models">Modèles ML</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button onClick={handleExportData} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Exporter JSON
                  </Button>

                  <div>
                    <Input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleImportData}
                      className="hidden"
                      id="import-file"
                    />
                    <Button asChild className="flex items-center gap-2 w-full">
                      <label htmlFor="import-file" className="cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Importer fichier
                      </label>
                    </Button>
                  </div>

                  <Button onClick={handleSyncData} variant="outline" className="flex items-center gap-2 bg-transparent">
                    <RefreshCw className="h-4 w-4" />
                    Synchroniser API
                  </Button>

                  <Button onClick={handleCleanupData} variant="destructive" className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Purger anciennes
                  </Button>
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
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium">Ajouter un utilisateur</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="new-user-email">Email</Label>
                      <Input
                        id="new-user-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="utilisateur@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-user-role">Rôle</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrateur</SelectItem>
                          <SelectItem value="editor">Éditeur</SelectItem>
                          <SelectItem value="viewer">Lecteur</SelectItem>
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
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddUser} className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Ajouter l'utilisateur
                  </Button>
                </div>

                {/* Liste des utilisateurs */}
                <div className="space-y-2">
                  <h4 className="font-medium">Utilisateurs existants</h4>
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {user.isActive ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">{user.email}</span>
                          </div>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : user.role === "editor" ? "secondary" : "outline"
                            }
                          >
                            {user.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            Dernière connexion: {formatDate(user.lastLogin)}
                          </span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleToggleUserStatus(user.id)}>
                              {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                            {user.role !== "admin" || users.filter((u) => u.role === "admin").length > 1 ? (
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
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
            <ModelManagementPanel />
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsAuthenticated(false)} className="w-full">
            Se déconnecter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
