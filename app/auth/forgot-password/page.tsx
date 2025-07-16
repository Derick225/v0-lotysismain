'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AppIcon } from '../../components/ui/icon-provider'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const { resetPassword } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir votre adresse email",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await resetPassword({ email })
      
      if (result.success) {
        setEmailSent(true)
        toast({
          title: "Email envoyé",
          description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe",
        })
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Une erreur s'est produite",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
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
            <CardTitle className="text-2xl text-center">Email envoyé</CardTitle>
            <CardDescription className="text-center">
              Vérifiez votre boîte mail
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert>
              <AppIcon name="mail" size={16} />
              <AlertDescription>
                Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
                Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe.
              </AlertDescription>
            </Alert>

            <div className="text-center text-sm text-muted-foreground">
              <p>Vous n'avez pas reçu l'email ?</p>
              <p>Vérifiez votre dossier spam ou</p>
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => setEmailSent(false)}
              >
                essayez avec une autre adresse
              </Button>
            </div>
          </CardContent>

          <CardFooter>
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
          <CardTitle className="text-2xl text-center">Mot de passe oublié</CardTitle>
          <CardDescription className="text-center">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
                <AppIcon 
                  name="mail" 
                  size={16} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
                />
              </div>
            </div>

            <Alert>
              <AppIcon name="info" size={16} />
              <AlertDescription>
                Vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
                Le lien sera valide pendant 1 heure.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <AppIcon name="refresh" className="animate-spin" size={16} />
                  Envoi en cours...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AppIcon name="mail" size={16} />
                  Envoyer le lien
                </div>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Vous vous souvenez de votre mot de passe ?{' '}
              <Link
                href="/auth/login"
                className="text-primary hover:underline font-medium"
              >
                Se connecter
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
