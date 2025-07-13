#!/usr/bin/env node

/**
 * Script pour corriger automatiquement les points-virgules manquants
 * dans les fichiers TypeScript/JavaScript
 */

const fs = require('fs');
const path = require('path');

// Fichiers à corriger
const filesToFix = [
  'lib/supabase.ts',
  'app/lib/supabase-test-service.ts',
  'app/lib/supabase-sync-service.ts',
  'app/hooks/use-supabase-sync.ts'
];

function fixSemicolons(content) {
  // Patterns pour ajouter des points-virgules
  const patterns = [
    // Import statements
    { regex: /^(import .+)(?<!;)$/gm, replacement: '$1;' },
    // Export statements
    { regex: /^(export .+)(?<!;)$/gm, replacement: '$1;' },
    // Variable declarations
    { regex: /^(\s*(?:const|let|var) .+)(?<!;)$/gm, replacement: '$1;' },
    // Function calls and expressions
    { regex: /^(\s*[^{}\s].*[^{};])$/gm, replacement: (match, p1) => {
      // Ne pas ajouter de point-virgule si la ligne se termine par {, }, ou contient des mots-clés de contrôle
      if (p1.match(/[{}]$/) || 
          p1.match(/^\s*(if|else|for|while|switch|try|catch|finally|function|class)\b/) ||
          p1.match(/^\s*\/\//) || 
          p1.match(/^\s*\*/) ||
          p1.match(/^\s*$/) ||
          p1.includes('//')) {
        return match;
      }
      return p1 + ';';
    }},
    // Return statements
    { regex: /^(\s*return .+)(?<!;)$/gm, replacement: '$1;' },
    // Throw statements
    { regex: /^(\s*throw .+)(?<!;)$/gm, replacement: '$1;' },
    // Break and continue
    { regex: /^(\s*(?:break|continue))(?<!;)$/gm, replacement: '$1;' }
  ];

  let fixedContent = content;
  
  patterns.forEach(pattern => {
    if (typeof pattern.replacement === 'function') {
      fixedContent = fixedContent.replace(pattern.regex, pattern.replacement);
    } else {
      fixedContent = fixedContent.replace(pattern.regex, pattern.replacement);
    }
  });

  return fixedContent;
}

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ Fichier non trouvé: ${filePath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const fixedContent = fixSemicolons(content);
    
    if (content !== fixedContent) {
      fs.writeFileSync(fullPath, fixedContent, 'utf8');
      console.log(`✅ Corrigé: ${filePath}`);
      return true;
    } else {
      console.log(`✓ Déjà correct: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la correction de ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Correction des points-virgules manquants...\n');
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  filesToFix.forEach(filePath => {
    totalFiles++;
    if (fixFile(filePath)) {
      fixedFiles++;
    }
  });
  
  console.log(`\n📊 Résumé:`);
  console.log(`- Fichiers traités: ${totalFiles}`);
  console.log(`- Fichiers corrigés: ${fixedFiles}`);
  
  if (fixedFiles === totalFiles) {
    console.log('🎉 Tous les fichiers ont été traités avec succès!');
  } else {
    console.log('⚠️ Certains fichiers n\'ont pas pu être corrigés.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixSemicolons, fixFile };
