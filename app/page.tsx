"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OptimizedIcon } from "./components/ui/optimized-icons";
import Link from "next/link";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <OptimizedIcon name="Loader2" className="animate-spin" size={24} />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OptimizedIcon name="Home" size={40} className="text-primary" />
            <h1 className="text-3xl font-bold">Lotysis</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/auth/login">
                <OptimizedIcon name="User" size={16} className="mr-2" />
                Connexion
              </Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">
                <OptimizedIcon name="UserPlus" size={16} className="mr-2" />
                Inscription
              </Link>
            </Button>
          </div>
        </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-16 space-y-16">
          <div className="text-center space-y-8">
            <h2 className="text-5xl font-bold text-gray-900">
              Analysez les loteries avec l'<span className="text-primary">Intelligence Artificielle</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lotysis utilise des algorithmes avancés de machine learning pour analyser les patterns 
              et générer des prédictions intelligentes pour vos jeux de loterie favoris.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/register">
                <OptimizedIcon name="Target" size={20} className="mr-2" />
                Commencer gratuitement
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/login">
                Découvrir les fonctionnalités
              </Link>
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Brain" size={24} className="text-blue-500" />
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
                <OptimizedIcon name="BarChart3" size={24} className="text-green-500" />
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
                <OptimizedIcon name="Target" size={24} className="text-purple-500" />
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

          {/* Stats Section */}
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-center mb-8">
              Pourquoi choisir Lotysis ?
            </h3>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">15+</div>
                <div className="text-muted-foreground">Algorithmes IA</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 mb-2">28</div>
                <div className="text-muted-foreground">Tirages supportés</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
                <div className="text-muted-foreground">Précision</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
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
              <OptimizedIcon name="UserPlus" size={20} className="mr-2" />
              Créer mon compte gratuit
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OptimizedIcon name="Home" size={24} className="text-primary" />
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
