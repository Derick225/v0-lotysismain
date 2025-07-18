"use client"

import React, { useState, useEffect } from 'react'
import { Heart, Star, Plus, Trash2, Bell, BellOff, Calendar, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DRAW_SCHEDULE, getNumberColor } from '@/app/lib/constants'

interface FavoriteNumber {
  id: string
  numbers: number[]
  name: string
  drawNames: string[]
  notifications: boolean
  created_at: string
  wins: number
  lastChecked: string
  confidence?: number
}

interface FavoritesMenuProps {
  onClose?: () => void
}

export function FavoritesMenu({ onClose }: FavoritesMenuProps) {
  const [favorites, setFavorites] = useState<FavoriteNumber[]>([])
  const [isAddingFavorite, setIsAddingFavorite] = useState(false)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [favoriteName, setFavoriteName] = useState('')
  const [selectedDraws, setSelectedDraws] = useState<string[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState('list')

  // Charger les favoris depuis le localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem('lottery-favorites')
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites))
      } catch (error) {
        console.error('Erreur chargement favoris:', error)
      }
    }
  }, [])

  // Sauvegarder les favoris
  const saveFavorites = (newFavorites: FavoriteNumber[]) => {
    setFavorites(newFavorites)
    localStorage.setItem('lottery-favorites', JSON.stringify(newFavorites))
  }

  // Ajouter un numéro à la sélection
  const toggleNumber = (number: number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== number))
    } else if (selectedNumbers.length < 5) {
      setSelectedNumbers([...selectedNumbers, number].sort((a, b) => a - b))
    }
  }

  // Basculer la sélection d'un tirage
  const toggleDraw = (drawName: string) => {
    if (selectedDraws.includes(drawName)) {
      setSelectedDraws(selectedDraws.filter(d => d !== drawName))
    } else {
      setSelectedDraws([...selectedDraws, drawName])
    }
  }

  // Ajouter un nouveau favori
  const addFavorite = () => {
    if (selectedNumbers.length !== 5 || !favoriteName.trim() || selectedDraws.length === 0) {
      return
    }

    const newFavorite: FavoriteNumber = {
      id: Date.now().toString(),
      numbers: selectedNumbers,
      name: favoriteName.trim(),
      drawNames: selectedDraws,
      notifications: notificationsEnabled,
      created_at: new Date().toISOString(),
      wins: 0,
      lastChecked: new Date().toISOString()
    }

    saveFavorites([...favorites, newFavorite])
    
    // Réinitialiser le formulaire
    setSelectedNumbers([])
    setFavoriteName('')
    setSelectedDraws([])
    setNotificationsEnabled(true)
    setIsAddingFavorite(false)
  }

  // Supprimer un favori
  const deleteFavorite = (id: string) => {
    saveFavorites(favorites.filter(f => f.id !== id))
  }

  // Basculer les notifications pour un favori
  const toggleNotifications = (id: string) => {
    const updated = favorites.map(f => 
      f.id === id ? { ...f, notifications: !f.notifications } : f
    )
    saveFavorites(updated)
  }

  // Obtenir tous les tirages disponibles
  const getAllDraws = () => {
    const draws: string[] = []
    Object.values(DRAW_SCHEDULE).forEach(daySchedule => {
      Object.values(daySchedule).forEach(drawName => {
        draws.push(drawName)
      })
    })
    return draws
  }

  // Composant pour afficher un numéro avec sa couleur
  const NumberBadge = ({ number }: { number: number }) => (
    <Badge 
      variant="outline" 
      className={`text-white font-bold ${getNumberColor(number)}`}
    >
      {number}
    </Badge>
  )

  // Générer des numéros aléatoires
  const generateRandomNumbers = () => {
    const numbers: number[] = []
    while (numbers.length < 5) {
      const randomNum = Math.floor(Math.random() * 90) + 1
      if (!numbers.includes(randomNum)) {
        numbers.push(randomNum)
      }
    }
    setSelectedNumbers(numbers.sort((a, b) => a - b))
  }

  // Sélectionner tous les tirages
  const selectAllDraws = () => {
    setSelectedDraws(getAllDraws())
  }

  // Statistiques des favoris
  const getFavoritesStats = () => {
    const totalFavorites = favorites.length
    const totalWins = favorites.reduce((sum, fav) => sum + fav.wins, 0)
    const withNotifications = favorites.filter(fav => fav.notifications).length
    const avgConfidence = favorites.reduce((sum, fav) => sum + (fav.confidence || 0), 0) / totalFavorites || 0

    return { totalFavorites, totalWins, withNotifications, avgConfidence }
  }

  const stats = getFavoritesStats()

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h2 className="text-xl font-bold">Mes Favoris</h2>
        </div>
        <Button
          onClick={() => setIsAddingFavorite(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalFavorites}</div>
            <div className="text-sm text-muted-foreground">Favoris</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalWins}</div>
            <div className="text-sm text-muted-foreground">Gains</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.withNotifications}</div>
            <div className="text-sm text-muted-foreground">Notifications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{(stats.avgConfidence * 100).toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Confiance</div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="list">Liste des favoris</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {favorites.length === 0 ? (
            <Alert>
              <Star className="w-4 h-4" />
              <AlertDescription>
                Aucun favori enregistré. Ajoutez vos combinaisons préférées pour les suivre facilement.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => (
                <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{favorite.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNotifications(favorite.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {favorite.notifications ? 
                            <Bell className="w-4 h-4" /> : 
                            <BellOff className="w-4 h-4" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFavorite(favorite.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Numéros */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Numéros:</span>
                      <div className="flex gap-2">
                        {favorite.numbers.map((number) => (
                          <NumberBadge key={number} number={number} />
                        ))}
                      </div>
                    </div>

                    {/* Tirages */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Tirages:</span>
                      <div className="flex flex-wrap gap-1">
                        {favorite.drawNames.map((drawName) => (
                          <Badge key={drawName} variant="secondary" className="text-xs">
                            {drawName}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Statistiques */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Gains: {favorite.wins}</span>
                      <span>Créé: {new Date(favorite.created_at).toLocaleDateString()}</span>
                      {favorite.confidence && (
                        <span>Confiance: {(favorite.confidence * 100).toFixed(1)}%</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Analyses des favoris
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2" />
                <p>Analyses détaillées disponibles prochainement</p>
                <p className="text-sm">Historique des performances, tendances et recommandations</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour ajouter un favori */}
      <Dialog open={isAddingFavorite} onOpenChange={setIsAddingFavorite}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un favori</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Nom du favori */}
            <div className="space-y-2">
              <Label htmlFor="favorite-name">Nom du favori</Label>
              <Input
                id="favorite-name"
                value={favoriteName}
                onChange={(e) => setFavoriteName(e.target.value)}
                placeholder="Ex: Ma combinaison porte-bonheur"
              />
            </div>

            {/* Sélection des numéros */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Numéros sélectionnés ({selectedNumbers.length}/5)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateRandomNumbers}
                >
                  Aléatoire
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedNumbers.map((number) => (
                  <NumberBadge key={number} number={number} />
                ))}
              </div>

              <div className="grid grid-cols-10 gap-2">
                {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => (
                  <Button
                    key={number}
                    variant={selectedNumbers.includes(number) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleNumber(number)}
                    disabled={!selectedNumbers.includes(number) && selectedNumbers.length >= 5}
                    className={`h-8 w-8 p-0 text-xs ${
                      selectedNumbers.includes(number) 
                        ? `text-white ${getNumberColor(number)}` 
                        : ''
                    }`}
                  >
                    {number}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sélection des tirages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tirages à surveiller ({selectedDraws.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllDraws}
                >
                  Tous
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {getAllDraws().map((drawName) => (
                  <Button
                    key={drawName}
                    variant={selectedDraws.includes(drawName) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDraw(drawName)}
                    className="text-xs h-8"
                  >
                    {drawName}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Activer les notifications</Label>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            <Separator />

            {/* Boutons d'action */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddingFavorite(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={addFavorite}
                disabled={selectedNumbers.length !== 5 || !favoriteName.trim() || selectedDraws.length === 0}
              >
                Ajouter le favori
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FavoritesMenu
