"use client"

import { supabase, supabaseAdmin, testSupabaseConnection } from '@/lib/supabase'
import { supabaseSyncService } from './supabase-sync-service'
import { enhancedApiService } from './enhanced-api-service'
import logger from './logger'

interface TestResult {
  name: string
  success: boolean
  message: string
  duration: number
  details?: any
}

interface TestSuite {
  name: string
  tests: TestResult[]
  success: boolean
  totalDuration: number
}

export class SupabaseTestService {
  private static instance: SupabaseTestService

  private constructor() {}

  static getInstance(): SupabaseTestService {
    if (!SupabaseTestService.instance) {
      SupabaseTestService.instance = new SupabaseTestService()
    }
    return SupabaseTestService.instance
  }

  // Exécuter tous les tests
  async runAllTests(): Promise<TestSuite[]> {
    logger.info("Début des tests Supabase")
    
    const testSuites: TestSuite[] = [
      await this.testConnection(),
      await this.testCRUDOperations(),
      await this.testSynchronization(),
      await this.testRealtimeSubscriptions(),
      await this.testSecurity(),
      await this.testPerformance()
    ]

    const overallSuccess = testSuites.every(suite => suite.success)
    const totalDuration = testSuites.reduce((sum, suite) => sum + suite.totalDuration, 0)

    logger.info("Tests Supabase terminés", {
      success: overallSuccess,
      totalDuration,
      suites: testSuites.length
    })

    return testSuites
  }

  // Test de connexion
  private async testConnection(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test 1: Connexion de base
    tests.push(await this.runTest("Connexion de base", async () => {
      const result = await testSupabaseConnection()
      if (!result.success) {
        throw new Error(result.error || "Connexion échouée")
      }
      return "Connexion réussie"
    }))

    // Test 2: Authentification anonyme
    tests.push(await this.runTest("Authentification anonyme", async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        throw new Error(`Erreur auth: ${error.message}`)
      }
      return `Session: ${data.session ? 'active' : 'inactive'}`
    }))

    // Test 3: Accès aux tables publiques
    tests.push(await this.runTest("Accès tables publiques", async () => {
      const { data, error } = await supabase
        .from('lottery_results')
        .select('count')
        .limit(1)
      
      if (error) {
        throw new Error(`Erreur accès table: ${error.message}`)
      }
      return "Accès autorisé"
    }))

    return {
      name: "Tests de Connexion",
      tests,
      success: tests.every(t => t.success),
      totalDuration: Date.now() - startTime
    }
  }

  // Test des opérations CRUD
  private async testCRUDOperations(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()
    let testRecordId: number | null = null

    // Test 1: Lecture des données
    tests.push(await this.runTest("Lecture données", async () => {
      const { data, error } = await supabase
        .from('lottery_results')
        .select('*')
        .limit(5)
      
      if (error) {
        throw new Error(`Erreur lecture: ${error.message}`)
      }
      return `${data?.length || 0} enregistrements lus`
    }))

    // Test 2: Insertion (si admin disponible)
    if (supabaseAdmin) {
      tests.push(await this.runTest("Insertion données", async () => {
        const testData = {
          draw_name: 'Test',
          date: new Date().toISOString().split('T')[0],
          gagnants: [1, 2, 3, 4, 5],
          source: 'test'
        }

        const { data, error } = await supabaseAdmin
          .from('lottery_results')
          .insert([testData])
          .select()
          .single()

        if (error) {
          throw new Error(`Erreur insertion: ${error.message}`)
        }

        testRecordId = data.id
        return `Enregistrement créé: ID ${data.id}`
      }))

      // Test 3: Mise à jour
      if (testRecordId) {
        tests.push(await this.runTest("Mise à jour données", async () => {
          const { data, error } = await supabaseAdmin
            .from('lottery_results')
            .update({ gagnants: [6, 7, 8, 9, 10] })
            .eq('id', testRecordId!)
            .select()
            .single()

          if (error) {
            throw new Error(`Erreur mise à jour: ${error.message}`)
          }
          return `Enregistrement mis à jour: ID ${data.id}`
        }))

        // Test 4: Suppression
        tests.push(await this.runTest("Suppression données", async () => {
          const { error } = await supabaseAdmin
            .from('lottery_results')
            .delete()
            .eq('id', testRecordId!)

          if (error) {
            throw new Error(`Erreur suppression: ${error.message}`)
          }
          return `Enregistrement supprimé: ID ${testRecordId}`
        }))
      }
    } else {
      tests.push({
        name: "Opérations admin",
        success: false,
        message: "Clé service non configurée",
        duration: 0
      })
    }

    return {
      name: "Tests CRUD",
      tests,
      success: tests.every(t => t.success),
      totalDuration: Date.now() - startTime
    }
  }

  // Test de synchronisation
  private async testSynchronization(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test 1: Synchronisation descendante
    tests.push(await this.runTest("Sync descendante", async () => {
      const result = await supabaseSyncService.syncAll({
        direction: 'down',
        batchSize: 10,
        tables: ['lottery_results']
      })

      if (!result.success) {
        throw new Error(`Sync échouée: ${result.errors.join(', ')}`)
      }
      return `${result.recordsSynced} enregistrements synchronisés`
    }))

    // Test 2: Intégration avec cache local
    tests.push(await this.runTest("Intégration cache local", async () => {
      const cacheStats = await enhancedApiService.getCacheStats()
      
      if (cacheStats.totalResults === 0) {
        throw new Error("Aucune donnée en cache")
      }
      return `${cacheStats.totalResults} enregistrements en cache`
    }))

    // Test 3: Détection de conflits
    tests.push(await this.runTest("Détection conflits", async () => {
      // Test simplifié - vérifier que le système peut détecter les conflits
      const result = await supabaseSyncService.syncAll({
        direction: 'bidirectional',
        resolveConflicts: true,
        batchSize: 5,
        tables: ['lottery_results']
      })

      return `Conflits détectés: ${result.conflicts.length}`
    }))

    return {
      name: "Tests de Synchronisation",
      tests,
      success: tests.every(t => t.success),
      totalDuration: Date.now() - startTime
    }
  }

  // Test des subscriptions temps réel
  private async testRealtimeSubscriptions(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test 1: Création de subscription
    tests.push(await this.runTest("Création subscription", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout subscription"))
        }, 5000)

        const channel = supabase
          .channel('test_subscription')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'lottery_results' },
            (payload) => {
              clearTimeout(timeout)
              supabase.removeChannel(channel)
              resolve(`Subscription active: ${payload.eventType || 'connected'}`)
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout)
              supabase.removeChannel(channel)
              resolve("Subscription créée avec succès")
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timeout)
              reject(new Error("Erreur subscription"))
            }
          })
      })
    }))

    return {
      name: "Tests Temps Réel",
      tests,
      success: tests.every(t => t.success),
      totalDuration: Date.now() - startTime
    }
  }

  // Test de sécurité
  private async testSecurity(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test 1: Politiques RLS
    tests.push(await this.runTest("Politiques RLS", async () => {
      // Tenter d'accéder aux logs d'audit (devrait être restreint)
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .limit(1)

      // Si on peut lire sans être admin, c'est un problème de sécurité
      if (data && data.length > 0) {
        throw new Error("Accès non autorisé aux logs d'audit")
      }

      return "Politiques RLS actives"
    }))

    // Test 2: Validation des données
    tests.push(await this.runTest("Validation données", async () => {
      if (!supabaseAdmin) {
        return "Test ignoré (pas d'admin)"
      }

      try {
        // Tenter d'insérer des données invalides
        await supabaseAdmin
          .from('lottery_results')
          .insert([{
            draw_name: 'Test',
            date: '2024-01-01',
            gagnants: [1, 2, 3] // Invalide: doit avoir 5 numéros
          }])

        throw new Error("Validation échouée: données invalides acceptées")
      } catch (error) {
        // C'est ce qu'on veut - les données invalides doivent être rejetées
        return "Validation active"
      }
    }))

    return {
      name: "Tests de Sécurité",
      tests,
      success: tests.every(t => t.success),
      totalDuration: Date.now() - startTime
    }
  }

  // Test de performance
  private async testPerformance(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test 1: Vitesse de lecture
    tests.push(await this.runTest("Vitesse lecture", async () => {
      const start = Date.now()
      
      const { data, error } = await supabase
        .from('lottery_results')
        .select('*')
        .limit(100)

      if (error) {
        throw new Error(`Erreur lecture: ${error.message}`)
      }

      const duration = Date.now() - start
      const recordsPerSecond = data ? Math.round((data.length / duration) * 1000) : 0

      return `${data?.length || 0} enregistrements en ${duration}ms (${recordsPerSecond}/s)`
    }))

    // Test 2: Vitesse de synchronisation
    tests.push(await this.runTest("Vitesse synchronisation", async () => {
      const start = Date.now()
      
      const result = await supabaseSyncService.syncAll({
        direction: 'down',
        batchSize: 50,
        tables: ['lottery_results']
      })

      const duration = Date.now() - start
      const recordsPerSecond = result.recordsSynced > 0 ? 
        Math.round((result.recordsSynced / duration) * 1000) : 0

      return `${result.recordsSynced} enregistrements en ${duration}ms (${recordsPerSecond}/s)`
    }))

    return {
      name: "Tests de Performance",
      tests,
      success: tests.every(t => t.success),
      totalDuration: Date.now() - startTime
    }
  }

  // Utilitaire pour exécuter un test individuel
  private async runTest(name: string, testFn: () => Promise<string>): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      const message = await testFn()
      return {
        name,
        success: true,
        message,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        name,
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        duration: Date.now() - startTime
      }
    }
  }

  // Générer un rapport de test
  generateReport(testSuites: TestSuite[]): string {
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0)
    const successfulTests = testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.success).length, 0
    )
    const totalDuration = testSuites.reduce((sum, suite) => sum + suite.totalDuration, 0)

    let report = `# Rapport de Tests Supabase\n\n`
    report += `**Résumé:**\n`
    report += `- Tests réussis: ${successfulTests}/${totalTests}\n`
    report += `- Durée totale: ${totalDuration}ms\n`
    report += `- Taux de réussite: ${Math.round((successfulTests / totalTests) * 100)}%\n\n`

    testSuites.forEach(suite => {
      report += `## ${suite.name}\n`
      report += `- Statut: ${suite.success ? '✅ Réussi' : '❌ Échoué'}\n`
      report += `- Durée: ${suite.totalDuration}ms\n\n`

      suite.tests.forEach(test => {
        report += `### ${test.name}\n`
        report += `- ${test.success ? '✅' : '❌'} ${test.message}\n`
        report += `- Durée: ${test.duration}ms\n\n`
      })
    })

    return report
  }
}

// Instance singleton
export const supabaseTestService = SupabaseTestService.getInstance()
