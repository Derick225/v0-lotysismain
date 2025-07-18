#!/usr/bin/env node

/**
 * Script de vérification de build pour détecter les erreurs webpack
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Test de build pour détecter les erreurs webpack...\n');

// Vérifier si package.json existe
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json introuvable');
  process.exit(1);
}

// Vérifier si next.config.mjs existe
if (!fs.existsSync('next.config.mjs')) {
  console.error('❌ next.config.mjs introuvable');
  process.exit(1);
}

// Vérifier si tsconfig.json existe
if (!fs.existsSync('tsconfig.json')) {
  console.error('❌ tsconfig.json introuvable');
  process.exit(1);
}

console.log('✅ Fichiers de configuration trouvés');

// Vérifier les fichiers critiques
const criticalFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'app/dashboard/page.tsx',
  'app/lib/constants.ts',
  'app/lib/indexeddb-cache.ts',
  'app/lib/ai-prediction-engine.ts',
  'app/hooks/use-offline-cache.ts',
  'app/components/offline-indicator.tsx',
  'app/components/draw-predictions.tsx',
  'app/components/draw-data.tsx'
];

console.log('\n📁 Vérification des fichiers critiques...');
let missingFiles = [];

criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MANQUANT`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log(`\n❌ ${missingFiles.length} fichier(s) critique(s) manquant(s)`);
  process.exit(1);
}

// Test de compilation TypeScript
console.log('\n🔍 Test de compilation TypeScript...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ Compilation TypeScript réussie');
} catch (error) {
  console.log('❌ Erreurs de compilation TypeScript:');
  console.log(error.stdout?.toString() || error.message);
  process.exit(1);
}

// Test de build Next.js
console.log('\n🏗️ Test de build Next.js...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build Next.js réussi');
} catch (error) {
  console.log('❌ Erreurs de build Next.js:');
  console.log(error.stdout?.toString() || error.message);
  process.exit(1);
}

console.log('\n🎉 Tous les tests de build ont réussi!');
console.log('✅ L\'application est prête pour le déploiement');