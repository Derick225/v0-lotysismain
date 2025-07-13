"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setDeferredPrompt(null)
      setShowInstallBanner(false)
    }
  }

  const dismissBanner = () => {
    setShowInstallBanner(false)
  }

  if (!showInstallBanner || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">Installer l'Application</h3>
          <p className="text-xs text-muted-foreground">
            Accédez rapidement à l'analyseur de loterie depuis votre écran d'accueil
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={dismissBanner} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleInstall} size="sm" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Installer
        </Button>
        <Button variant="outline" size="sm" onClick={dismissBanner}>
          Plus tard
        </Button>
      </div>
    </div>
  )
}
