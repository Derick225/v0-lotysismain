#!/usr/bin/env node

/**
 * Script pour configurer le système d'authentification Lotysis
 * Exécute les migrations Supabase et configure les politiques RLS
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes')
  console.error('Assurez-vous que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupAuth() {
  console.log('🔧 Configuration du système d\'authentification Lotysis...\n')

  try {
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241215000001_auth_system.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Fichier de migration non trouvé:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Exécution de la migration de base de données...')
    
    // Diviser le SQL en commandes individuelles
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (const command of commands) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: command })
        if (error) {
          console.warn(`⚠️  Avertissement lors de l'exécution de la commande: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
      } catch (error) {
        console.warn(`⚠️  Erreur lors de l'exécution de la commande: ${error.message}`)
        errorCount++
      }
    }

    console.log(`✅ Migration terminée: ${successCount} commandes réussies, ${errorCount} erreurs/avertissements\n`)

    // Vérifier que les tables ont été créées
    console.log('🔍 Vérification des tables créées...')
    
    const tables = ['profiles', 'user_preferences', 'user_sessions', 'login_attempts', 'password_reset_tokens']
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.error(`❌ Erreur lors de la vérification de la table ${table}:`, error.message)
      } else {
        console.log(`✅ Table ${table} créée avec succès`)
      }
    }

    // Vérifier les politiques RLS
    console.log('\n🔒 Vérification des politiques RLS...')
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies')
    
    if (policiesError) {
      console.warn('⚠️  Impossible de vérifier les politiques RLS:', policiesError.message)
    } else {
      console.log(`✅ ${policies?.length || 0} politiques RLS configurées`)
    }

    // Créer un utilisateur admin par défaut si nécessaire
    console.log('\n👤 Configuration de l\'utilisateur administrateur...')
    
    const adminEmail = 'admin@lotysis.com'
    const adminPassword = 'Admin123!@#'
    
    const { data: existingAdmin, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', adminEmail)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erreur lors de la vérification de l\'admin:', checkError.message)
    } else if (!existingAdmin) {
      // Créer l'utilisateur admin
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Administrateur Lotysis',
          role: 'admin'
        }
      })
      
      if (authError) {
        console.error('❌ Erreur lors de la création de l\'admin:', authError.message)
      } else {
        console.log('✅ Utilisateur administrateur créé')
        console.log(`📧 Email: ${adminEmail}`)
        console.log(`🔑 Mot de passe: ${adminPassword}`)
        console.log('⚠️  Changez ce mot de passe après la première connexion!')
      }
    } else {
      console.log('✅ Utilisateur administrateur déjà existant')
    }

    console.log('\n🎉 Configuration du système d\'authentification terminée avec succès!')
    console.log('\n📋 Prochaines étapes:')
    console.log('1. Démarrez l\'application: npm run dev')
    console.log('2. Accédez à /auth/login pour vous connecter')
    console.log('3. Utilisez les identifiants admin pour accéder au panneau d\'administration')
    console.log('4. Configurez les paramètres de l\'application selon vos besoins')

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error)
    process.exit(1)
  }
}

// Fonction pour créer la fonction exec_sql si elle n'existe pas
async function createExecSqlFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
  
  try {
    const { error } = await supabase.rpc('exec', { sql: createFunctionSQL })
    if (error) {
      console.log('Note: Fonction exec_sql déjà existante ou non nécessaire')
    }
  } catch (error) {
    // Ignorer les erreurs de création de fonction
  }
}

// Fonction pour obtenir les politiques RLS
async function createGetPoliciesFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION get_policies()
    RETURNS TABLE(schemaname text, tablename text, policyname text) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        pol.schemaname::text,
        pol.tablename::text,
        pol.policyname::text
      FROM pg_policies pol
      WHERE pol.schemaname = 'public';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
  
  try {
    const { error } = await supabase.rpc('exec', { sql: createFunctionSQL })
    if (error) {
      console.log('Note: Fonction get_policies déjà existante ou non nécessaire')
    }
  } catch (error) {
    // Ignorer les erreurs de création de fonction
  }
}

// Exécuter le script
if (require.main === module) {
  createExecSqlFunction()
    .then(() => createGetPoliciesFunction())
    .then(() => setupAuth())
    .catch(error => {
      console.error('❌ Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = { setupAuth }
