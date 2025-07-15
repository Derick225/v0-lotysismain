'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppIcon } from '../../components/ui/icon-provider'
import { useToast } from '@/hooks/use-toast'

export default function VerifyEmailPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const token = searchParams.get('token')
  const type = searchParams.get('type')

  useEffect(() => {
    if (token && type === 'signup') {
      verifyEmail(token)
    }
  }, [token, type])

  const verifyEmail = async (token: string) => {
    setIsVerifying(true)
    setError(null)

    try {
      // Ici, vous pouvez ajouter la logique de vérification avec Supabase
      // Pour l'instant, on simule une vérification réussie
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setIsVerified(true)
      toast({
        title: "Email vérifié",
        description: "Votre compte a été activé avec succès",
      })
    } catch (error) {
      setError("Erreur lors de la vérification de l'email")
      toast({
        title: "Erreur de vérification",
        description: "Le lien de vérification est invalide ou a expiré",
        variant: "destructive"
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendEmail = async () => {
    toast({
      title: "Email renvoyé",
      description: "Un nouvel email de vérification a été envoyé",
    })
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-2">
                <AppIcon name="home" size={32} className="text-primary" />
                <span className="text-2xl font-bold">Lotysis</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Vérification en cours</CardTitle>
            <CardDescription className="text-center">
              Vérification de votre adresse email...
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <AppIcon name="refresh" className="animate-spin" size={32} />
            <p className="text-center text-muted-foreground">
              Veuillez patienter pendant que nous vérifions votre email
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-2">
                <AppIcon name="home" size={32} className="text-primary" />
                <span className="text-2xl font-bold">Lotysis</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Email vérifié</CardTitle>
            <CardDescription className="text-center">
              Votre compte a été activé avec succès
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert>
              <AppIcon name="success" size={16} />
              <AlertDescription>
                Félicitations ! Votre adresse email a été vérifiée.
                Vous pouvez maintenant vous connecter à votre compte Lotysis.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              <AppIcon name="user" size={16} className="mr-2" />
              Se connecter
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-2">
                <AppIcon name="home" size={32} className="text-primary" />
                <span className="text-2xl font-bold">Lotysis</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Erreur de vérification</CardTitle>
            <CardDescription className="text-center">
              Impossible de vérifier votre email
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AppIcon name="error" size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="text-center text-sm text-muted-foreground">
              <p>Le lien de vérification est peut-être expiré.</p>
              <p>Vous pouvez demander un nouveau lien de vérification.</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2">
            <Button
              className="w-full"
              onClick={handleResendEmail}
            >
              <AppIcon name="mail" size={16} className="mr-2" />
              Renvoyer l'email de vérification
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              <AppIcon name="back" size={16} className="mr-2" />
              Retour à la connexion
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Page par défaut (sans token)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              <AppIcon name="home" size={32} className="text-primary" />
              <span className="text-2xl font-bold">Lotysis</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Vérifiez votre email</CardTitle>
          <CardDescription className="text-center">
            Un email de vérification a été envoyé
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AppIcon name="mail" size={16} />
            <AlertDescription>
              Nous avons envoyé un email de vérification à votre adresse.
              Cliquez sur le lien dans l'email pour activer votre compte.
            </AlertDescription>
          </Alert>

          <div className="text-center text-sm text-muted-foreground">
            <p>Vous n'avez pas reçu l'email ?</p>
            <p>Vérifiez votre dossier spam ou cliquez ci-dessous pour le renvoyer.</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button
            className="w-full"
            onClick={handleResendEmail}
          >
            <AppIcon name="mail" size={16} className="mr-2" />
            Renvoyer l'email
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            <Link
              href="/auth/login"
              className="text-primary hover:underline font-medium"
            >
              Retour à la connexion
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
