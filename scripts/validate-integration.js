#!/usr/bin/env node

/**
 * Script de validation complète de l'intégration Supabase
 * Vérifie tous les aspects de l'intégration
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Validation de l\'intégration Supabase complète')
console.log('='.repeat(60))

let globalErrors = []

// Validation du schéma de base de données
async function validateDatabaseSchema() {
  console.log('📊 Validation du schéma de base de données...')

  const migrationFiles = [
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/002_rls_policies.sql',
    'supabase/migrations/001_cloud_sync_tables.sql',
    'supabase/migrations/20241215000001_auth_system.sql'
  ]

  let schemaValid = true

  for (const file of migrationFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: Trouvé`)

      try {
        const content = fs.readFileSync(file, 'utf8')
        if (content.trim().length === 0) {
          console.log(`⚠️ ${file}: Fichier vide`)
          schemaValid = false
        }
      } catch (error) {
        console.log(`❌ ${file}: Erreur de lecture - ${error.message}`)
        schemaValid = false
      }
    } else {
      console.log(`❌ ${file}: Manquant`)
      schemaValid = false
    }
  }

  return schemaValid
}

// Validation des politiques RLS
async function validateRLSPolicies() {
  console.log('🔐 Validation des politiques RLS...')

  const rlsFile = 'supabase/migrations/002_rls_policies.sql'

  if (!fs.existsSync(rlsFile)) {
    console.log('❌ Fichier des politiques RLS manquant')
    return false
  }

  try {
    const content = fs.readFileSync(rlsFile, 'utf8')
    const requiredPolicies = [
      'CREATE POLICY',
      'ALTER TABLE',
      'ENABLE ROW LEVEL SECURITY'
    ]

    let policiesFound = 0
    for (const policy of requiredPolicies) {
      if (content.includes(policy)) {
        policiesFound++
      }
    }

    console.log(`✅ Politiques RLS: ${policiesFound}/${requiredPolicies.length} trouvées`)
    return policiesFound === requiredPolicies.length
  } catch (error) {
    console.log(`❌ Erreur validation RLS: ${error.message}`)
    return false
  }
}

// Validation des fonctions
async function validateFunctions() {
  console.log('⚙️ Validation des fonctions...')

  const functionFiles = [
    'app/lib/supabase-sync-service.ts',
    'app/hooks/use-supabase-sync.ts',
    'app/components/supabase-sync-status.tsx'
  ]

  let functionsValid = true

  for (const file of functionFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: OK`)
    } else {
      console.log(`❌ ${file}: Manquant`)
      functionsValid = false
    }
  }

  return functionsValid
}

// Validation des subscriptions temps réel
async function validateRealtimeSubscriptions() {
  console.log('📡 Validation des subscriptions temps réel...')

  const realtimeFiles = [
    'app/lib/realtime-service.ts',
    'app/components/realtime-notifications.tsx'
  ]

  let realtimeValid = true

  for (const file of realtimeFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: OK`)
    } else {
      console.log(`❌ ${file}: Manquant`)
      realtimeValid = false
    }
  }

  return realtimeValid
}

// Validation des performances
async function validatePerformance() {
  console.log('⚡ Validation des performances...')

  const performanceFiles = [
    'app/hooks/use-performance-monitor.ts',
    'app/components/monitoring-dashboard.tsx'
  ]

  let performanceValid = true

  for (const file of performanceFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: OK`)
    } else {
      console.log(`❌ ${file}: Manquant`)
      performanceValid = false
    }
  }

  return performanceValid
}

// Validation de la structure des fichiers
async function validateFileStructure() {
  console.log('📁 Validation de la structure des fichiers...')

  const requiredFiles = [
    'app/lib/supabase.ts',
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
  console.log('='.repeat(60))

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

    console.log('\n' + '='.repeat(60))
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