'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from './components/ui/icon-provider'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              <AppIcon name="home" size={32} className="text-primary" />
              <span className="text-2xl font-bold">Lotysis</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Page non trouvée</CardTitle>
          <CardDescription>
            La page que vous recherchez n'existe pas ou a été déplacée
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="text-6xl font-bold text-muted-foreground">404</div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Oups ! Il semble que cette page n'existe pas.
            </p>
            <p className="text-sm text-muted-foreground">
              Vérifiez l'URL ou retournez à l'accueil.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/">
                <AppIcon name="home" size={16} className="mr-2" />
                Retour à l'accueil
              </Link>
            </Button>
            
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <AppIcon name="statistics" size={16} className="mr-2" />
                Aller au dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
