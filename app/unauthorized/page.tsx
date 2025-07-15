'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppIcon } from '../components/ui/icon-provider'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              <AppIcon name="home" size={32} className="text-primary" />
              <span className="text-2xl font-bold">Lotysis</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-red-600">Accès non autorisé</CardTitle>
          <CardDescription>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-center">
            <AppIcon name="shield" size={64} className="text-red-500" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Cette page nécessite des droits d'administrateur.
            </p>
            <p className="text-sm text-muted-foreground">
              Si vous pensez qu'il s'agit d'une erreur, contactez l'administrateur.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/dashboard">
                <AppIcon name="home" size={16} className="mr-2" />
                Retour au dashboard
              </Link>
            </Button>
            
            <Button variant="outline" asChild>
              <Link href="/auth/login">
                <AppIcon name="user" size={16} className="mr-2" />
                Se reconnecter
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
