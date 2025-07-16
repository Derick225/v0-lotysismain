#!/usr/bin/env node

/**
 * Script de vérification pour s'assurer que l'application peut être compilée
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔍 Vérification de la configuration de l\'application Lotysis...\n')

// Vérifier les fichiers essentiels
const essentialFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'tailwind.config.ts',
  'app/layout.tsx',
  'app/page.tsx',
  'app/lib/auth.ts',
  'app/hooks/use-auth.ts',
  'app/types/auth.ts',
  'app/auth/login/page.tsx',
  'app/auth/register/page.tsx',
  'app/dashboard/page.tsx',
  'components/ui/button.tsx',
  'hooks/use-toast.ts'
]

console.log('📁 Vérification des fichiers essentiels...')
let missingFiles = []

essentialFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - MANQUANT`)
    missingFiles.push(file)
  }
})

if (missingFiles.length > 0) {
  console.log(`\n❌ ${missingFiles.length} fichier(s) manquant(s):`)
  missingFiles.forEach(file => console.log(`   - ${file}`))
  process.exit(1)
}

// Vérifier les dépendances
console.log('\n📦 Vérification des dépendances...')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const requiredDeps = [
    'next',
    'react',
    'react-dom',
    '@supabase/supabase-js',
    '@supabase/auth-helpers-nextjs',
    'lucide-react',
    '@heroicons/react',
    '@tabler/icons-react',
    'react-icons'
  ]

  let missingDeps = []
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep}`)
    } else {
      console.log(`❌ ${dep} - MANQUANT`)
      missingDeps.push(dep)
    }
  })

  if (missingDeps.length > 0) {
    console.log(`\n❌ ${missingDeps.length} dépendance(s) manquante(s):`)
    missingDeps.forEach(dep => console.log(`   - ${dep}`))
    console.log('\n💡 Exécutez: npm install pour installer les dépendances')
    process.exit(1)
  }
} catch (error) {
  console.log('❌ Erreur lors de la lecture de package.json:', error.message)
  process.exit(1)
}

// Vérifier la configuration TypeScript
console.log('\n🔧 Vérification de la configuration TypeScript...')
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
  
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths['@/*']) {
    console.log('✅ Configuration des chemins TypeScript')
  } else {
    console.log('⚠️  Configuration des chemins TypeScript manquante')
  }
  
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.jsx) {
    console.log('✅ Configuration JSX')
  } else {
    console.log('❌ Configuration JSX manquante')
  }
} catch (error) {
  console.log('❌ Erreur lors de la lecture de tsconfig.json:', error.message)
}

// Vérifier les variables d'environnement
console.log('\n🌍 Vérification des variables d\'environnement...')
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

let missingEnvVars = []
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}`)
  } else {
    console.log(`⚠️  ${envVar} - NON DÉFINIE`)
    missingEnvVars.push(envVar)
  }
})

if (missingEnvVars.length > 0) {
  console.log(`\n⚠️  ${missingEnvVars.length} variable(s) d'environnement manquante(s):`)
  missingEnvVars.forEach(envVar => console.log(`   - ${envVar}`))
  console.log('\n💡 Créez un fichier .env.local avec ces variables')
}

// Test de compilation TypeScript
console.log('\n🔨 Test de compilation TypeScript...')
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' })
  console.log('✅ Compilation TypeScript réussie')
} catch (error) {
  console.log('❌ Erreurs de compilation TypeScript:')
  console.log(error.stdout?.toString() || error.message)
  process.exit(1)
}

// Test de build Next.js (optionnel)
if (process.argv.includes('--build')) {
  console.log('\n🏗️  Test de build Next.js...')
  try {
    execSync('npm run build', { stdio: 'inherit' })
    console.log('✅ Build Next.js réussie')
  } catch (error) {
    console.log('❌ Erreur lors du build Next.js')
    process.exit(1)
  }
}

console.log('\n🎉 Vérification terminée avec succès!')
console.log('\n📋 Prochaines étapes:')
console.log('1. Configurez vos variables d\'environnement Supabase')
console.log('2. Exécutez: npm run setup-auth')
console.log('3. Démarrez l\'application: npm run dev')
console.log('4. Accédez à http://localhost:3000')

console.log('\n💡 Conseils:')
console.log('- Utilisez --build pour tester la compilation complète')
console.log('- Vérifiez les logs de la console pour les erreurs')
console.log('- Consultez la documentation Supabase pour la configuration')
