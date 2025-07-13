"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  Download,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Alert } from "@/app/services/monitoring-service"

interface NotificationSettings {
  enabled: boolean
  sound: boolean
  desktop: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  severityFilter: {
    low: boolean
    medium: boolean
    high: boolean
    critical: boolean
  }
  channels: {
    browser: boolean
    email: boolean
    sms: boolean
    webhook: boolean
  }
  customSound?: string
}

interface NotificationHistory {
  id: string
  timestamp: string
  type: "alert" | "system" | "info"
  severity: "low" | "medium" | "high" | "critical"
  title: string
  message: string
  channel: string
  status: "sent" | "failed" | "pending"
  read: boolean
}

interface NotificationSystemProps {
  className?: string
}

export function NotificationSystem({ className }: NotificationSystemProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sound: true,
    desktop: true,
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
    },
    severityFilter: {
      low: true,
      medium: true,
      high: true,
      critical: true,
    },
    channels: {
      browser: true,
      email: false,
      sms: false,
      webhook: false,
    },
  })

  const [history, setHistory] = useState<NotificationHistory[]>([])
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default")
  const [testNotification, setTestNotification] = useState("")
  const [filterSeverity, setFilterSeverity] = useState<"all" | "low" | "medium" | "high" | "critical">("all")
  const [filterChannel, setFilterChannel] = useState<"all" | "browser" | "email" | "sms" | "webhook">("all")

  const { toast } = useToast()

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("lotysis_notification_settings")
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error("Error loading notification settings:", error)
      }
    }

    // Load notification history
    const savedHistory = localStorage.getItem("lotysis_notification_history")
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory).slice(-100)) // Keep last 100 notifications
      } catch (error) {
        console.error("Error loading notification history:", error)
      }
    }

    // Check notification permission
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission)
    }

    // Set up event listeners for alerts
    const handleAlert = (event: CustomEvent) => {
      const alert = event.detail as Alert
      handleNewNotification({
        type: "alert",
        severity: alert.severity,
        title: `Alert: ${alert.rule_name}`,
        message: alert.message,
        channel: "browser",
      })
    }

    window.addEventListener("alert-triggered", handleAlert as EventListener)

    return () => {
      window.removeEventListener("alert-triggered", handleAlert as EventListener)
    }
  }, [])

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings)
    localStorage.setItem("lotysis_notification_settings", JSON.stringify(newSettings))
  }

  const saveHistory = (newHistory: NotificationHistory[]) => {
    setHistory(newHistory)
    localStorage.setItem("lotysis_notification_history", JSON.stringify(newHistory.slice(-100)))
  }

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)

      if (permission === "granted") {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez maintenant des notifications de bureau.",
        })
      } else {
        toast({
          title: "Notifications refusées",
          description: "Les notifications de bureau ne seront pas affichées.",
          variant: "destructive",
        })
      }
    }
  }

  const isInQuietHours = () => {
    if (!settings.quietHours.enabled) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const [startHour, startMin] = settings.quietHours.start.split(":").map(Number)
    const [endHour, endMin] = settings.quietHours.end.split(":").map(Number)

    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  const shouldShowNotification = (severity: string) => {
    if (!settings.enabled) return false
    if (isInQuietHours() && severity !== "critical") return false
    return settings.severityFilter[severity as keyof typeof settings.severityFilter]
  }

  const handleNewNotification = (notification: Omit<NotificationHistory, "id" | "timestamp" | "status" | "read">) => {
    if (!shouldShowNotification(notification.severity)) return

    const newNotification: NotificationHistory = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: "sent",
      read: false,
    }

    // Add to history
    const newHistory = [newNotification, ...history].slice(0, 100)
    saveHistory(newHistory)

    // Show browser notification
    if (settings.desktop && settings.channels.browser && permissionStatus === "granted") {
      const browserNotification = new Notification(newNotification.title, {
        body: newNotification.message,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: newNotification.id,
        requireInteraction: newNotification.severity === "critical",
      })

      browserNotification.onclick = () => {
        window.focus()
        markAsRead(newNotification.id)
        browserNotification.close()
      }

      // Auto-close after 5 seconds for non-critical alerts
      if (newNotification.severity !== "critical") {
        setTimeout(() => browserNotification.close(), 5000)
      }
    }

    // Play sound
    if (settings.sound && !isInQuietHours()) {
      playNotificationSound(newNotification.severity)
    }

    // Send to other channels
    if (settings.channels.email) {
      sendEmailNotification(newNotification)
    }
    if (settings.channels.sms) {
      sendSMSNotification(newNotification)
    }
    if (settings.channels.webhook) {
      sendWebhookNotification(newNotification)
    }
  }

  const playNotificationSound = (severity: string) => {
    try {
      const audio = new Audio(settings.customSound || getDefaultSound(severity))
      audio.volume = 0.5
      audio.play().catch((error) => {
        console.warn("Could not play notification sound:", error)
      })
    } catch (error) {
      console.warn("Error playing notification sound:", error)
    }
  }

  const getDefaultSound = (severity: string) => {
    switch (severity) {
      case "critical":
        return "/sounds/critical-alert.mp3"
      case "high":
        return "/sounds/high-alert.mp3"
      case "medium":
        return "/sounds/medium-alert.mp3"
      case "low":
        return "/sounds/low-alert.mp3"
      default:
        return "/sounds/default-notification.mp3"
    }
  }

  const sendEmailNotification = async (notification: NotificationHistory) => {
    // Placeholder for email notification
    console.log("📧 Email notification:", notification)
  }

  const sendSMSNotification = async (notification: NotificationHistory) => {
    // Placeholder for SMS notification
    console.log("📱 SMS notification:", notification)
  }

  const sendWebhookNotification = async (notification: NotificationHistory) => {
    // Placeholder for webhook notification
    console.log("🔗 Webhook notification:", notification)
  }

  const markAsRead = (notificationId: string) => {
    const newHistory = history.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif))
    saveHistory(newHistory)
  }

  const markAllAsRead = () => {
    const newHistory = history.map((notif) => ({ ...notif, read: true }))
    saveHistory(newHistory)
    toast({
      title: "Notifications marquées",
      description: "Toutes les notifications ont été marquées comme lues.",
    })
  }

  const clearHistory = () => {
    saveHistory([])
    toast({
      title: "Historique effacé",
      description: "L'historique des notifications a été supprimé.",
    })
  }

  const sendTestNotification = () => {
    if (!testNotification.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un message de test.",
        variant: "destructive",
      })
      return
    }

    handleNewNotification({
      type: "system",
      severity: "medium",
      title: "Test de notification",
      message: testNotification,
      channel: "browser",
    })

    setTestNotification("")
    toast({
      title: "Notification de test envoyée",
      description: "La notification de test a été envoyée.",
    })
  }

  const exportHistory = () => {
    const data = {
      notifications: history,
      settings,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `notifications-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Export réussi",
      description: "L'historique des notifications a été exporté.",
    })
  }

  const getFilteredHistory = () => {
    return history.filter((notif) => {
      const severityMatch = filterSeverity === "all" || notif.severity === filterSeverity
      const channelMatch = filterChannel === "all" || notif.channel === filterChannel
      return severityMatch && channelMatch
    })
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "low":
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "browser":
        return <Bell className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <Smartphone className="h-4 w-4" />
      case "webhook":
        return <Webhook className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const unreadCount = history.filter((notif) => !notif.read).length

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Système de notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {settings.enabled ? (
                <Bell className="h-4 w-4 text-green-500" />
              ) : (
                <BellOff className="h-4 w-4 text-red-500" />
              )}
              {settings.sound ? (
                <Volume2 className="h-4 w-4 text-green-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paramètres généraux */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Paramètres généraux</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications-enabled">Notifications activées</Label>
                <Switch
                  id="notifications-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => saveSettings({ ...settings, enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sound-enabled">Sons activés</Label>
                <Switch
                  id="sound-enabled"
                  checked={settings.sound}
                  onCheckedChange={(checked) => saveSettings({ ...settings, sound: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="desktop-enabled">Notifications bureau</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="desktop-enabled"
                    checked={settings.desktop && permissionStatus === "granted"}
                    onCheckedChange={(checked) => {
                      if (checked && permissionStatus !== "granted") {
                        requestNotificationPermission()
                      } else {
                        saveSettings({ ...settings, desktop: checked })
                      }
                    }}
                  />
                  {permissionStatus === "denied" && (
                    <Badge variant="destructive" className="text-xs">
                      Refusé
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Heures silencieuses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet-hours">Heures silencieuses</Label>
                <Switch
                  id="quiet-hours"
                  checked={settings.quietHours.enabled}
                  onCheckedChange={(checked) =>
                    saveSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, enabled: checked },
                    })
                  }
                />
              </div>

              {settings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-4">
                  <div>
                    <Label htmlFor="quiet-start">Début</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={settings.quietHours.start}
                      onChange={(e) =>
                        saveSettings({
                          ...settings,
                          quietHours: { ...settings.quietHours, start: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet-end">Fin</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={settings.quietHours.end}
                      onChange={(e) =>
                        saveSettings({
                          ...settings,
                          quietHours: { ...settings.quietHours, end: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Filtres par sévérité */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Filtres par sévérité</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(settings.severityFilter).map(([severity, enabled]) => (
                <div key={severity} className="flex items-center justify-between">
                  <Label htmlFor={`severity-${severity}`} className="capitalize">
                    {severity}
                  </Label>
                  <Switch
                    id={`severity-${severity}`}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      saveSettings({
                        ...settings,
                        severityFilter: { ...settings.severityFilter, [severity]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Canaux de notification */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Canaux de notification</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(settings.channels).map(([channel, enabled]) => (
                <div key={channel} className="flex items-center justify-between">
                  <Label htmlFor={`channel-${channel}`} className="flex items-center gap-2">
                    {getChannelIcon(channel)}
                    <span className="capitalize">{channel}</span>
                  </Label>
                  <Switch
                    id={`channel-${channel}`}
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      saveSettings({
                        ...settings,
                        channels: { ...settings.channels, [channel]: checked },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Test de notification */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Test de notification</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Message de test..."
                value={testNotification}
                onChange={(e) => setTestNotification(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendTestNotification()}
              />
              <Button onClick={sendTestNotification}>Envoyer test</Button>
            </div>
          </div>

          <Separator />

          {/* Historique des notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Historique des notifications</h3>
              <div className="flex items-center gap-2">
                <Select value={filterSeverity} onValueChange={(value: any) => setFilterSeverity(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="low">Faible</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterChannel} onValueChange={(value: any) => setFilterChannel(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous canaux</SelectItem>
                    <SelectItem value="browser">Navigateur</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tout lire
                </Button>

                <Button variant="outline" size="sm" onClick={exportHistory}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>

                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Effacer
                </Button>
              </div>
            </div>

            <ScrollArea className="h-96 border rounded-lg">
              {getFilteredHistory().length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Bell className="h-12 w-12 mx-auto mb-4" />
                  <p>Aucune notification trouvée</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {getFilteredHistory().map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        notification.read ? "bg-background" : "bg-muted/50"
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getSeverityIcon(notification.severity)}
                            <Badge className={getSeverityColor(notification.severity)}>{notification.severity}</Badge>
                            <div className="flex items-center gap-1">
                              {getChannelIcon(notification.channel)}
                              <span className="text-xs text-muted-foreground">{notification.channel}</span>
                            </div>
                            {!notification.read && (
                              <Badge variant="default" className="text-xs">
                                Nouveau
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
