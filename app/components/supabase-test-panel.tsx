"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  RefreshCw,
  Database,
  Shield,
  Zap,
  Activity
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabaseTestService } from '../lib/supabase-test-service'

interface TestSuite {
  name: string
  tests: TestResult[]
  success: boolean
  totalDuration: number
}

interface TestResult {
  name: string
  success: boolean
  message: string
  duration: number
  details?: any
}

export function SupabaseTestPanel() {
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [currentTest, setCurrentTest] = useState<string>('')
  const [progress, setProgress] = useState(0)

  // Exécuter tous les tests
  const runAllTests = async () => {
    setIsRunning(true)
    setTestSuites([])
    setProgress(0)
    setCurrentTest('Initialisation des tests...')

    try {
      const results = await supabaseTestService.runAllTests()
      setTestSuites(results)
      setProgress(100)
      setCurrentTest('Tests terminés')

      const totalTests = results.reduce((sum, suite) => sum + suite.tests.length, 0)
      const successfulTests = results.reduce((sum, suite) => 
        sum + suite.tests.filter(t => t.success).length, 0
      )

      toast({
        title: "Tests terminés",
        description: `${successfulTests}/${totalTests} tests réussis`,
        variant: successfulTests === totalTests ? "default" : "destructive",
      })

    } catch (error) {
      toast({
        title: "Erreur lors des tests",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
      setCurrentTest('')
    }
  }

  // Télécharger le rapport
  const downloadReport = () => {
    if (testSuites.length === 0) {
      toast({
        title: "Aucun rapport disponible",
        description: "Exécutez d'abord les tests pour générer un rapport",
        variant: "destructive",
      })
      return
    }

    const report = supabaseTestService.generateReport(testSuites)
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `supabase-test-report-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Rapport téléchargé",
      description: "Le rapport de tests a été téléchargé avec succès",
    })
  }

  // Calculer les statistiques globales
  const getOverallStats = () => {
    if (testSuites.length === 0) {
      return { total: 0, successful: 0, failed: 0, duration: 0 }
    }

    const total = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0)
    const successful = testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.success).length, 0
    )
    const failed = total - successful
    const duration = testSuites.reduce((sum, suite) => sum + suite.totalDuration, 0)

    return { total, successful, failed, duration }
  }

  const stats = getOverallStats()

  // Obtenir l'icône pour chaque suite de tests
  const getSuiteIcon = (suiteName: string) => {
    switch (suiteName) {
      case 'Tests de Connexion': return <Database className="h-4 w-4" />
      case 'Tests CRUD': return <Activity className="h-4 w-4" />
      case 'Tests de Synchronisation': return <RefreshCw className="h-4 w-4" />
      case 'Tests Temps Réel': return <Zap className="h-4 w-4" />
      case 'Tests de Sécurité': return <Shield className="h-4 w-4" />
      case 'Tests de Performance': return <Activity className="h-4 w-4" />
      default: return <TestTube className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Tests d'Intégration Supabase
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="results">Résultats</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Contrôles de test */}
            <div className="flex gap-2">
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isRunning ? 'Tests en cours...' : 'Exécuter tous les tests'}
              </Button>
              
              <Button
                onClick={downloadReport}
                variant="outline"
                disabled={testSuites.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Rapport
              </Button>
            </div>

            {/* Progression */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentTest}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Statistiques globales */}
            {stats.total > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total tests</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.successful}
                  </div>
                  <div className="text-sm text-muted-foreground">Réussis</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {stats.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">Échoués</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.duration}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Durée</div>
                </div>
              </div>
            )}

            {/* Taux de réussite */}
            {stats.total > 0 && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Taux de Réussite Global</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Réussite</span>
                    <span>{Math.round((stats.successful / stats.total) * 100)}%</span>
                  </div>
                  <Progress 
                    value={(stats.successful / stats.total) * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {testSuites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun résultat de test disponible</p>
                <p className="text-sm">Exécutez les tests pour voir les résultats</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testSuites.map((suite, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getSuiteIcon(suite.name)}
                        {suite.name}
                        <Badge variant={suite.success ? "default" : "destructive"}>
                          {suite.success ? "Réussi" : "Échoué"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Tests: {suite.tests.filter(t => t.success).length}/{suite.tests.length}</span>
                          <span>Durée: {suite.totalDuration}ms</span>
                        </div>
                        <Progress 
                          value={(suite.tests.filter(t => t.success).length / suite.tests.length) * 100}
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {testSuites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun détail disponible</p>
              </div>
            ) : (
              <div className="space-y-6">
                {testSuites.map((suite, suiteIndex) => (
                  <div key={suiteIndex} className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {getSuiteIcon(suite.name)}
                      {suite.name}
                    </h3>
                    
                    <div className="space-y-2">
                      {suite.tests.map((test, testIndex) => (
                        <Alert 
                          key={testIndex} 
                          variant={test.success ? "default" : "destructive"}
                        >
                          <div className="flex items-start gap-2">
                            {test.success ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{test.name}</div>
                              <AlertDescription className="mt-1">
                                {test.message}
                              </AlertDescription>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{test.duration}ms</span>
                              </div>
                            </div>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
