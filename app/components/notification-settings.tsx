"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Settings,
  TestTube
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { VALID_DRAW_NAMES } from '../lib/constants'
import { useNotifications, type NotificationConfig } from '../lib/notification-service'

interface NotificationSettingsProps {
  className?: string
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { toast } = useToast()
  const {
    config,
    stats,
    updateConfig,
    requestPermission,
    testNotification
  } = useNotifications()

  const [localConfig, setLocalConfig] = useState<NotificationConfig>(config)

  // Synchroniser avec la configuration globale
  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  // Gérer l'activation des notifications
  const handleEnableNotifications = async (enabled: boolean) => {
    if (enabled && stats.permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        toast({
          title: "Permission refusée",
          description: "Les notifications ont été refusées. Vous pouvez les activer dans les paramètres du navigateur.",
          variant: "destructive",
        })
        return
      }
    }

    const newConfig = { ...localConfig, enabled }
    setLocalConfig(newConfig)
    updateConfig(newConfig)

    toast({
      title: enabled ? "Notifications activées" : "Notifications désactivées",
      description: enabled 
        ? "Vous recevrez des rappels pour vos tirages favoris"
        : "Vous ne recevrez plus de notifications",
    })
  }

  // Gérer la sélection des tirages
  const handleDrawSelection = (drawName: string, selected: boolean) => {
    const newDrawNames = selected
      ? [...localConfig.drawNames, drawName]
      : localConfig.drawNames.filter(name => name !== drawName)

    const newConfig = { ...localConfig, drawNames: newDrawNames }
    setLocalConfig(newConfig)
    updateConfig(newConfig)
  }

  // Gérer le délai de rappel
  const handleReminderMinutesChange = (minutes: string) => {
    const newConfig = { ...localConfig, reminderMinutes: parseInt(minutes) }
    setLocalConfig(newConfig)
    updateConfig(newConfig)
  }

  // Test de notification
  const handleTestNotification = async () => {
    try {
      const success = await testNotification()
      if (success) {
        toast({
          title: "Test réussi",
          description: "La notification de test a été envoyée avec succès",
        })
      } else {
        toast({
          title: "Test échoué",
          description: "Impossible d'envoyer la notification de test",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du test",
        variant: "destructive",
      })
    }
  }

  // Obtenir le statut des permissions
  const getPermissionBadge = () => {
    switch (stats.permission) {
      case 'granted':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Autorisées</Badge>
      case 'denied':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Refusées</Badge>
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Paramètres de Notification
            {getPermissionBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="draws">Tirages</TabsTrigger>
              <TabsTrigger value="advanced">Avancé</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              {/* Activation principale */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Activer les notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des rappels pour les tirages sélectionnés
                  </p>
                </div>
                <Switch
                  checked={localConfig.enabled}
                  onCheckedChange={handleEnableNotifications}
                />
              </div>

              {/* Délai de rappel */}
              <div className="space-y-2">
                <Label>Délai de rappel</Label>
                <Select
                  value={localConfig.reminderMinutes.toString()}
                  onValueChange={handleReminderMinutesChange}
                  disabled={!localConfig.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes avant</SelectItem>
                    <SelectItem value="10">10 minutes avant</SelectItem>
                    <SelectItem value="15">15 minutes avant</SelectItem>
                    <SelectItem value="30">30 minutes avant</SelectItem>
                    <SelectItem value="60">1 heure avant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.scheduledCount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Notifications programmées
                  </div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.configuredDraws}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tirages configurés
                  </div>
                </div>
              </div>

              {/* Test de notification */}
              <Button
                onClick={handleTestNotification}
                variant="outline"
                className="w-full"
                disabled={!stats.isSupported || stats.permission !== 'granted'}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Tester les notifications
              </Button>
            </TabsContent>

            <TabsContent value="draws" className="space-y-4">
              <div className="space-y-2">
                <Label>Sélectionner les tirages à surveiller</Label>
                <p className="text-sm text-muted-foreground">
                  Choisissez les tirages pour lesquels vous souhaitez recevoir des rappels
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {Array.from(VALID_DRAW_NAMES).map((drawName) => (
                  <div
                    key={drawName}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <Label className="font-medium">{drawName}</Label>
                    <Switch
                      checked={localConfig.drawNames.includes(drawName)}
                      onCheckedChange={(checked) => handleDrawSelection(drawName, checked)}
                      disabled={!localConfig.enabled}
                    />
                  </div>
                ))}
              </div>

              {localConfig.drawNames.length === 0 && localConfig.enabled && (
                <div className="text-center py-4 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun tirage sélectionné</p>
                  <p className="text-sm">Sélectionnez au moins un tirage pour recevoir des notifications</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              {/* Options audio et vibration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {localConfig.soundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                    <div>
                      <Label className="font-medium">Son des notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Jouer un son lors des notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localConfig.soundEnabled}
                    onCheckedChange={(checked) => {
                      const newConfig = { ...localConfig, soundEnabled: checked }
                      setLocalConfig(newConfig)
                      updateConfig(newConfig)
                    }}
                    disabled={!localConfig.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <div>
                      <Label className="font-medium">Vibration</Label>
                      <p className="text-sm text-muted-foreground">
                        Faire vibrer l'appareil (mobile uniquement)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localConfig.vibrationEnabled}
                    onCheckedChange={(checked) => {
                      const newConfig = { ...localConfig, vibrationEnabled: checked }
                      setLocalConfig(newConfig)
                      updateConfig(newConfig)
                    }}
                    disabled={!localConfig.enabled}
                  />
                </div>
              </div>

              {/* Informations système */}
              <div className="space-y-2">
                <Label>Informations système</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Support des notifications:</span>
                    <Badge variant={stats.isSupported ? "default" : "destructive"}>
                      {stats.isSupported ? "Supporté" : "Non supporté"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Permission:</span>
                    <Badge variant={stats.permission === 'granted' ? "default" : "outline"}>
                      {stats.permission}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>État:</span>
                    <Badge variant={stats.enabled ? "default" : "secondary"}>
                      {stats.enabled ? "Activé" : "Désactivé"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions avancées */}
              <div className="space-y-2">
                <Label>Actions</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => requestPermission()}
                    variant="outline"
                    size="sm"
                    disabled={stats.permission === 'granted'}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Demander permission
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
