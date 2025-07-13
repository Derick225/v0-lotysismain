#!/usr/bin/env node

/**
 * Script de configuration automatique pour Supabase
 * Ce script configure la base de données, les politiques RLS et les données de test
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runMigration(migrationFile) {
  console.log(`📄 Exécution de la migration: ${migrationFile}`)
  
  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    // Diviser le SQL en commandes individuelles
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0)
    
    for (const command of commands) {
      if (command.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: command.trim() + ';' })
        if (error) {
          console.error(`❌ Erreur dans la commande SQL:`, error)
          console.error(`Commande: ${command.substring(0, 100)}...`)
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} terminée`)
  } catch (error) {
    console.error(`❌ Erreur lors de l'exécution de ${migrationFile}:`, error)
    throw error
  }
}

async function testConnection() {
  console.log('🔗 Test de connexion à Supabase...')
  
  try {
    const { data, error } = await supabase.from('_supabase_migrations').select('*').limit(1)
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      throw error
    }
    
    console.log('✅ Connexion à Supabase réussie')
    return true
  } catch (error) {
    console.error('❌ Échec de la connexion à Supabase:', error)
    return false
  }
}

async function createTestData() {
  console.log('📊 Création des données de test...')
  
  try {
    // Données de test pour les résultats de loterie
    const testResults = [
      {
        draw_name: 'National',
        date: '2024-01-01',
        gagnants: [5, 12, 23, 34, 45],
        machine: [8, 15, 27, 38, 49],
        source: 'test'
      },
      {
        draw_name: 'Monday Special',
        date: '2024-01-01',
        gagnants: [3, 18, 29, 41, 67],
        machine: [7, 22, 33, 44, 55],
        source: 'test'
      },
      {
        draw_name: 'Prestige',
        date: '2024-01-02',
        gagnants: [1, 14, 25, 36, 78],
        machine: [9, 20, 31, 42, 63],
        source: 'test'
      }
    ]
    
    const { data, error } = await supabase
      .from('lottery_results')
      .upsert(testResults, { onConflict: 'draw_name,date' })
    
    if (error) {
      throw error
    }
    
    console.log(`✅ ${testResults.length} résultats de test créés`)
    
    // Données de test pour les prédictions
    const testPredictions = [
      {
        draw_name: 'National',
        prediction_date: '2024-01-03',
        predicted_numbers: [7, 19, 28, 39, 56],
        algorithm: 'XGBoost',
        confidence: 75.5,
        metadata: { version: '1.0', features_used: 25 }
      },
      {
        draw_name: 'Monday Special',
        prediction_date: '2024-01-03',
        predicted_numbers: [11, 24, 35, 46, 72],
        algorithm: 'RNN-LSTM',
        confidence: 68.2,
        metadata: { version: '1.0', sequence_length: 20 }
      }
    ]
    
    const { data: predData, error: predError } = await supabase
      .from('predictions')
      .upsert(testPredictions, { onConflict: 'draw_name,prediction_date,algorithm' })
    
    if (predError) {
      throw predError
    }
    
    console.log(`✅ ${testPredictions.length} prédictions de test créées`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error)
    throw error
  }
}

async function verifySetup() {
  console.log('🔍 Vérification de la configuration...')
  
  try {
    // Vérifier les tables principales
    const tables = ['lottery_results', 'user_favorites', 'notification_settings', 'predictions', 'ml_models', 'audit_logs', 'sync_status']
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        console.error(`❌ Erreur d'accès à la table ${table}:`, error)
      } else {
        console.log(`✅ Table ${table} accessible`)
      }
    }
    
    // Vérifier les vues
    const views = ['public_statistics', 'recent_predictions_with_accuracy', 'active_ml_models']
    
    for (const view of views) {
      const { data, error } = await supabase.from(view).select('*').limit(1)
      
      if (error) {
        console.error(`❌ Erreur d'accès à la vue ${view}:`, error)
      } else {
        console.log(`✅ Vue ${view} accessible`)
      }
    }
    
    // Vérifier les fonctions
    const { data: funcData, error: funcError } = await supabase.rpc('batch_insert_lottery_results', {
      results: []
    })
    
    if (funcError) {
      console.error('❌ Erreur d\'accès à la fonction batch_insert_lottery_results:', funcError)
    } else {
      console.log('✅ Fonction batch_insert_lottery_results accessible')
    }
    
    console.log('✅ Vérification terminée')
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error)
    throw error
  }
}

async function main() {
  console.log('🚀 Configuration de Supabase pour Lotysis PWA')
  console.log('=' * 50)
  
  try {
    // 1. Test de connexion
    const connected = await testConnection()
    if (!connected) {
      process.exit(1)
    }
    
    // 2. Exécution des migrations
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_rls_policies.sql'
    ]
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
      if (fs.existsSync(migrationPath)) {
        await runMigration(migrationFile)
      } else {
        console.warn(`⚠️ Fichier de migration non trouvé: ${migrationFile}`)
      }
    }
    
    // 3. Création des données de test
    if (process.argv.includes('--with-test-data')) {
      await createTestData()
    }
    
    // 4. Vérification de la configuration
    await verifySetup()
    
    console.log('\n🎉 Configuration Supabase terminée avec succès!')
    console.log('\nProchaines étapes:')
    console.log('1. Vérifiez que toutes les tables sont créées dans votre dashboard Supabase')
    console.log('2. Configurez les variables d\'environnement dans .env.local')
    console.log('3. Testez l\'application avec les données de test')
    console.log('4. Configurez l\'authentification si nécessaire')
    
  } catch (error) {
    console.error('\n💥 Erreur lors de la configuration:', error)
    process.exit(1)
  }
}

// Exécution du script
if (require.main === module) {
  main()
}

module.exports = {
  runMigration,
  testConnection,
  createTestData,
  verifySetup
}
