"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppIcon } from "./components/ui/icon-provider";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Rediriger vers le dashboard si l'utilisateur est connecté
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Afficher la page de chargement pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <AppIcon name="refresh" className="animate-spin" size={24} />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  // Page d'accueil pour les utilisateurs non connectés
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête */}
      <header className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppIcon name="home" size={40} className="text-primary" />
            <h1 className="text-3xl font-bold">Lotysis</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/auth/login">
                <AppIcon name="user" size={16} className="mr-2" />
                Connexion
              </Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">
                <AppIcon name="userPlus" size={16} className="mr-2" />
                Inscription
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            Analyseur de Loterie Intelligent
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Utilisez l'intelligence artificielle pour analyser les résultats de loterie 
            et générer des prédictions basées sur des algorithmes avancés de machine learning.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/register">
                <AppIcon name="predictions" size={20} className="mr-2" />
                Commencer gratuitement
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/login">
                Découvrir les fonctionnalités
              </Link>
            </Button>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppIcon name="brain" size={24} className="text-blue-500" />
                Intelligence Artificielle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Algorithmes avancés de machine learning incluant XGBoost, RNN-LSTM, 
                Monte Carlo et apprentissage par renforcement.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppIcon name="statistics" size={24} className="text-green-500" />
                Analyses Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analyses approfondies des tendances, fréquences et patterns 
                dans les résultats historiques de loterie.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppIcon name="predictions" size={24} className="text-purple-500" />
                Prédictions Précises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Génération de prédictions avec scores de confiance et 
                explications détaillées des recommandations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Statistiques */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">
            Pourquoi choisir Lotysis ?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-500 mb-2">87.5%</div>
              <div className="text-muted-foreground">Précision moyenne</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-500 mb-2">10,000+</div>
              <div className="text-muted-foreground">Prédictions générées</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-500 mb-2">4</div>
              <div className="text-muted-foreground">Algorithmes IA</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500 mb-2">24/7</div>
              <div className="text-muted-foreground">Disponibilité</div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">
            Prêt à améliorer vos chances ?
          </h3>
          <p className="text-xl text-muted-foreground mb-8">
            Rejoignez des milliers d'utilisateurs qui font confiance à Lotysis
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/register">
              <AppIcon name="userPlus" size={20} className="mr-2" />
              Créer mon compte gratuit
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppIcon name="home" size={24} className="text-primary" />
            <span className="font-semibold">Lotysis</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2024 Lotysis. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
