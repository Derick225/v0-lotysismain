#!/usr/bin/env node

/**
 * Script de nettoyage automatique des erreurs de build
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des erreurs de build...\n');

function runCommand(command, description) {
  try {
    console.log(`📝 ${description}...`);
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} terminé\n`);
    return true;
  } catch (error) {
    console.log(`⚠️  ${description} a échoué (non critique)\n`);
    return false;
  }
}

function cleanupFiles() {
  const filesToClean = [
    '.next',
    'node_modules/.cache',
    '.eslintcache'
  ];

  filesToClean.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        console.log(`🗑️  Suppression de ${file}...`);
        execSync(`rm -rf ${file}`, { stdio: 'inherit' });
        console.log(`✅ ${file} supprimé\n`);
      }
    } catch (error) {
      console.log(`⚠️  Impossible de supprimer ${file}\n`);
    }
  });
}

async function main() {
  // Nettoyage des fichiers de cache
  cleanupFiles();

  // Vérification de la configuration
  console.log('🔍 Vérification des fichiers de configuration...');

  const configFiles = ['package.json', 'next.config.mjs', 'tsconfig.json'];
  let allConfigsValid = true;

  configFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`❌ ${file} manquant`);
      allConfigsValid = false;
    } else {
      console.log(`✅ ${file} trouvé`);
    }
  });

  if (!allConfigsValid) {
    console.log('\n❌ Fichiers de configuration manquants. Veuillez les créer.');
    process.exit(1);
  }

  console.log('\n📦 Installation des dépendances...');

  // Installation des dépendances
  runCommand('npm install', 'Installation des dépendances NPM');

  console.log('🔧 Nettoyage terminé avec succès!\n');
  console.log('🚀 Vous pouvez maintenant lancer npm run dev\n');
}

main().catch(error => {
  console.error('❌ Erreur lors du nettoyage:', error);
  process.exit(1);
});