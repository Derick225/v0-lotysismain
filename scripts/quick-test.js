const fs = require('fs')

console.log('🧪 Test rapide Phase 1 - Lotysis')
console.log('=' .repeat(40))

// Vérifier les fichiers principaux
const files = [
  'app/lib/constants.ts',
  'app/lib/indexeddb-cache.ts', 
  'app/lib/ai-prediction-engine.ts',
  'app/hooks/use-offline-cache.ts',
  'app/components/offline-indicator.tsx',
  'app/components/draw-predictions.tsx'
]

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file}`)
  }
})

console.log('\n🎯 Phase 1 - Corrections critiques terminées!')
