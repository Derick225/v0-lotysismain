#!/usr/bin/env node

/**
 * Script de validation de l'intégration Supabase complète
 * Vérifie que tous les composants fonctionnent ensemble
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function validateDatabaseSchema() {
  console.log('🔍 Validation du schéma de base de données...')
  
  const requiredTables = [
    'lottery_results',
    'user_favorites', 
    'notification_settings',
    'predictions',
    'ml_models',
    'audit_logs',
    'sync_status'
  ]

  const requiredViews = [
    'public_statistics',
    'recent_predictions_with_accuracy',
    'active_ml_models'
  ]

  let allValid = true

  // Vérifier les tables
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.error(`❌ Table ${table}: ${error.message}`)
        allValid = false
      } else {
        console.log(`✅ Table ${table}: OK`)
      }
    } catch (error) {
      console.error(`❌ Table ${table}: ${error.message}`)
      allValid = false
    }
  }

  // Vérifier les vues
  for (const view of requiredViews) {
    try {
      const { data, error } = await supabase.from(view).select('*').limit(1)
      if (error) {
        console.error(`❌ Vue ${view}: ${error.message}`)
        allValid = false
      } else {
        console.log(`✅ Vue ${view}: OK`)
      }
    } catch (error) {
      console.error(`❌ Vue ${view}: ${error.message}`)
      allValid = false
    }
  }

  return allValid
}

async function validateRLSPolicies() {
  console.log('🔒 Validation des politiques RLS...')
  
  let allValid = true

  // Test d'accès public aux résultats de loterie
  try {
    const publicClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await publicClient.from('lottery_results').select('*').limit(1)
    
    if (error) {
      console.error(`❌ Accès public lottery_results: ${error.message}`)
      allValid = false
    } else {
      console.log('✅ Accès public lottery_results: OK')
    }
  } catch (error) {
    console.error(`❌ Test accès public: ${error.message}`)
    allValid = false
  }

  // Test de restriction d'accès aux logs d'audit
  try {
    const publicClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await publicClient.from('audit_logs').select('*').limit(1)
    
    // On s'attend à une erreur ici (accès restreint)
    if (!error) {
      console.error('❌ Logs d\'audit accessibles publiquement (problème de sécurité)')
      allValid = false
    } else {
      console.log('✅ Restriction logs d\'audit: OK')
    }
  } catch (error) {
    console.log('✅ Restriction logs d\'audit: OK')
  }

  return allValid
}

async function validateFunctions() {
  console.log('⚙️ Validation des fonctions...')
  
  let allValid = true

  // Test de la fonction batch_insert_lottery_results
  try {
    const testData = [{
      draw_name: 'Test_Validation',
      date: '2024-01-01',
      gagnants: [1, 2, 3, 4, 5],
      source: 'validation'
    }]

    const { data, error } = await supabase.rpc('batch_insert_lottery_results', {
      results: testData
    })

    if (error) {
      console.error(`❌ Fonction batch_insert_lottery_results: ${error.message}`)
      allValid = false
    } else {
      console.log('✅ Fonction batch_insert_lottery_results: OK')
      
      // Nettoyer les données de test
      await supabase
        .from('lottery_results')
        .delete()
        .eq('draw_name', 'Test_Validation')
    }
  } catch (error) {
    console.error(`❌ Test fonction batch_insert: ${error.message}`)
    allValid = false
  }

  return allValid
}

async function validateRealtimeSubscriptions() {
  console.log('⚡ Validation des subscriptions temps réel...')
  
  return new Promise((resolve) => {
    let subscriptionWorking = false
    
    const timeout = setTimeout(() => {
      if (!subscriptionWorking) {
        console.error('❌ Subscription temps réel: Timeout')
        resolve(false)
      }
    }, 10000)

    const channel = supabase
      .channel('validation_test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lottery_results' },
        (payload) => {
          subscriptionWorking = true
          clearTimeout(timeout)
          supabase.removeChannel(channel)
          console.log('✅ Subscription temps réel: OK')
          resolve(true)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscriptionWorking = true
          clearTimeout(timeout)
          supabase.removeChannel(channel)
          console.log('✅ Subscription temps réel: OK')
          resolve(true)
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout)
          console.error('❌ Subscription temps réel: Erreur de canal')
          resolve(false)
        }
      })
  })
}

async function validatePerformance() {
  console.log('🚀 Validation des performances...')
  
  let allValid = true

  // Test de vitesse de lecture
  const startRead = Date.now()
  try {
    const { data, error } = await supabase
      .from('lottery_results')
      .select('*')
      .limit(100)

    const readDuration = Date.now() - startRead
    
    if (error) {
      console.error(`❌ Test lecture: ${error.message}`)
      allValid = false
    } else {
      console.log(`✅ Lecture 100 enregistrements: ${readDuration}ms`)
      
      if (readDuration > 5000) {
        console.warn(`⚠️ Lecture lente: ${readDuration}ms (> 5s)`)
      }
    }
  } catch (error) {
    console.error(`❌ Test performance lecture: ${error.message}`)
    allValid = false
  }

  return allValid
}

async function validateFileStructure() {
  console.log('📁 Validation de la structure des fichiers...')
  
  const requiredFiles = [
    'lib/supabase.ts',
    'app/lib/supabase-sync-service.ts',
    'app/hooks/use-supabase-sync.ts',
    'app/components/supabase-sync-status.tsx',
    'app/components/supabase-test-panel.tsx',
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/002_rls_policies.sql',
    '.env.example'
  ]

  let allValid = true

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}: OK`)
    } else {
      console.error(`❌ ${file}: Manquant`)
      allValid = false
    }
  }

  return allValid
}

async function generateValidationReport(results) {
  const timestamp = new Date().toISOString()
  const overallSuccess = Object.values(results).every(result => result)
  
  const report = `# Rapport de Validation Supabase

**Date:** ${timestamp}
**Statut global:** ${overallSuccess ? '✅ SUCCÈS' : '❌ ÉCHEC'}

## Résultats détaillés

### Schéma de base de données
${results.schema ? '✅ Valide' : '❌ Invalide'}

### Politiques RLS
${results.rls ? '✅ Valides' : '❌ Invalides'}

### Fonctions
${results.functions ? '✅ Valides' : '❌ Invalides'}

### Subscriptions temps réel
${results.realtime ? '✅ Valides' : '❌ Invalides'}

### Performances
${results.performance ? '✅ Acceptables' : '❌ Problématiques'}

### Structure des fichiers
${results.files ? '✅ Complète' : '❌ Incomplète'}

## Recommandations

${overallSuccess ? 
  '🎉 L\'intégration Supabase est complète et fonctionnelle!' :
  '⚠️ Certains problèmes doivent être résolus avant la mise en production.'
}

### Prochaines étapes
1. Vérifiez les erreurs signalées ci-dessus
2. Testez l'application en mode développement
3. Configurez les sauvegardes automatiques
4. Surveillez les performances en production
`

  const reportPath = path.join(process.cwd(), 'validation-report.md')
  fs.writeFileSync(reportPath, report)
  
  console.log(`\n📄 Rapport généré: ${reportPath}`)
  return overallSuccess
}

async function main() {
  console.log('🔍 Validation de l\'intégration Supabase complète')
  console.log('=' * 60)
  
  const results = {}
  
  try {
    results.schema = await validateDatabaseSchema()
    console.log()
    
    results.rls = await validateRLSPolicies()
    console.log()
    
    results.functions = await validateFunctions()
    console.log()
    
    results.realtime = await validateRealtimeSubscriptions()
    console.log()
    
    results.performance = await validatePerformance()
    console.log()
    
    results.files = await validateFileStructure()
    console.log()
    
    const overallSuccess = await generateValidationReport(results)
    
    console.log('\n' + '=' * 60)
    if (overallSuccess) {
      console.log('🎉 VALIDATION RÉUSSIE - Intégration Supabase complète!')
      console.log('\nL\'application est prête pour la production.')
    } else {
      console.log('❌ VALIDATION ÉCHOUÉE - Problèmes détectés')
      console.log('\nVeuillez corriger les erreurs avant de continuer.')
    }
    
    process.exit(overallSuccess ? 0 : 1)
    
  } catch (error) {
    console.error('\n💥 Erreur critique lors de la validation:', error)
    process.exit(1)
  }
}

// Exécution du script
if (require.main === module) {
  main()
}

module.exports = {
  validateDatabaseSchema,
  validateRLSPolicies,
  validateFunctions,
  validateRealtimeSubscriptions,
  validatePerformance,
  validateFileStructure
}
