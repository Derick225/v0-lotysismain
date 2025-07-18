#!/usr/bin/env node

/**
 * Script pour générer toutes les icônes nécessaires pour l'application Lotysis
 * Génère les favicons, icônes PWA, icônes Apple Touch, et icônes Microsoft
 */

const fs = require('fs')
const path = require('path')

// Configuration des icônes à générer
const iconSizes = {
  // Favicons
  favicons: [16, 32, 96],
  
  // Icônes PWA
  pwa: [128, 192, 256, 384, 512],
  
  // Apple Touch Icons
  apple: [57, 60, 72, 76, 114, 120, 144, 152, 180],
  
  // Microsoft Tiles
  microsoft: [70, 150, 310],
  
  // Splash screens Apple (largeur x hauteur)
  appleSplash: [
    { width: 640, height: 1136, name: 'iphone5' },
    { width: 750, height: 1334, name: 'iphone6' },
    { width: 1125, height: 2436, name: 'iphoneX' },
    { width: 1242, height: 2208, name: 'iphone6plus' },
    { width: 1536, height: 2048, name: 'ipad' },
    { width: 1668, height: 2388, name: 'ipadpro10' },
    { width: 2048, height: 2732, name: 'ipadpro12' },
  ]
}

// Couleurs du thème Lotysis
const colors = {
  primary: '#2563eb',
  secondary: '#764ba2',
  background: '#ffffff',
  text: '#ffffff'
}

// Fonction pour créer le contenu SVG de base
function createBaseSVG(size, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  ${content}
</svg>`
}

// Fonction pour créer l'icône principale
function createMainIcon(size) {
  const borderRadius = size * 0.2
  const fontSize = size * 0.5
  const diceSize = size * 0.3
  const diceY = size * 0.2
  const letterY = size * 0.8
  
  return createBaseSVG(size, `
    <rect width="${size}" height="${size}" rx="${borderRadius}" ry="${borderRadius}" fill="url(#grad1)"/>
    <text x="${size/2}" y="${diceY + diceSize/2}" text-anchor="middle" dominant-baseline="middle" font-size="${diceSize}" fill="${colors.text}">🎲</text>
    <text x="${size/2}" y="${letterY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold" font-family="system-ui, sans-serif" fill="${colors.text}">L</text>
  `)
}

// Fonction pour créer l'icône maskable
function createMaskableIcon(size) {
  const borderRadius = size * 0.1 // Plus petit rayon pour les icônes maskable
  const fontSize = size * 0.4
  const diceSize = size * 0.25
  const diceY = size * 0.25
  const letterY = size * 0.75
  
  return createBaseSVG(size, `
    <rect width="${size}" height="${size}" rx="${borderRadius}" ry="${borderRadius}" fill="url(#grad1)"/>
    <text x="${size/2}" y="${diceY + diceSize/2}" text-anchor="middle" dominant-baseline="middle" font-size="${diceSize}" fill="${colors.text}">🎲</text>
    <text x="${size/2}" y="${letterY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold" font-family="system-ui, sans-serif" fill="${colors.text}">L</text>
  `)
}

// Fonction pour créer les splash screens
function createSplashScreen(width, height) {
  const centerX = width / 2
  const centerY = height / 2
  const iconSize = Math.min(width, height) * 0.3
  const fontSize = iconSize * 0.5
  const diceSize = iconSize * 0.3
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad1)"/>
  <g transform="translate(${centerX}, ${centerY})">
    <rect x="${-iconSize/2}" y="${-iconSize/2}" width="${iconSize}" height="${iconSize}" rx="${iconSize*0.2}" ry="${iconSize*0.2}" fill="${colors.background}" opacity="0.1"/>
    <text x="0" y="${-iconSize*0.1}" text-anchor="middle" dominant-baseline="middle" font-size="${diceSize}" fill="${colors.text}">🎲</text>
    <text x="0" y="${iconSize*0.2}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold" font-family="system-ui, sans-serif" fill="${colors.text}">Lotysis</text>
  </g>
</svg>`
}

// Fonction pour créer le favicon ICO (simplifié)
function createFaviconSVG() {
  return createBaseSVG(32, `
    <rect width="32" height="32" rx="6" ry="6" fill="url(#grad1)"/>
    <text x="16" y="22" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="bold" font-family="system-ui, sans-serif" fill="${colors.text}">L</text>
  `)
}

// Fonction pour créer l'icône Safari pinned tab
function createSafariIcon() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 2h12v12H2V2z" fill="#000"/>
  <text x="8" y="11" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" font-family="system-ui, sans-serif" fill="#fff">L</text>
</svg>`
}

// Fonction principale pour générer toutes les icônes
function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public')
  
  // Créer le dossier public s'il n'existe pas
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  console.log('🎨 Génération des icônes Lotysis...')

  // Générer les favicons
  console.log('📱 Génération des favicons...')
  iconSizes.favicons.forEach(size => {
    const svg = createMainIcon(size)
    fs.writeFileSync(path.join(publicDir, `favicon-${size}x${size}.png.svg`), svg)
    console.log(`  ✓ favicon-${size}x${size}.png.svg`)
  })

  // Générer les icônes PWA
  console.log('🌐 Génération des icônes PWA...')
  iconSizes.pwa.forEach(size => {
    const svg = createMainIcon(size)
    fs.writeFileSync(path.join(publicDir, `icon-${size}x${size}.png.svg`), svg)
    console.log(`  ✓ icon-${size}x${size}.png.svg`)
  })

  // Générer l'icône maskable
  const maskableSvg = createMaskableIcon(512)
  fs.writeFileSync(path.join(publicDir, 'maskable-icon-512x512.png.svg'), maskableSvg)
  console.log('  ✓ maskable-icon-512x512.png.svg')

  // Générer les Apple Touch Icons
  console.log('🍎 Génération des Apple Touch Icons...')
  iconSizes.apple.forEach(size => {
    const svg = createMainIcon(size)
    fs.writeFileSync(path.join(publicDir, `apple-touch-icon-${size}x${size}.png.svg`), svg)
    console.log(`  ✓ apple-touch-icon-${size}x${size}.png.svg`)
  })

  // Générer les Microsoft Tiles
  console.log('🪟 Génération des Microsoft Tiles...')
  iconSizes.microsoft.forEach(size => {
    const svg = createMainIcon(size)
    fs.writeFileSync(path.join(publicDir, `mstile-${size}x${size}.png.svg`), svg)
    console.log(`  ✓ mstile-${size}x${size}.png.svg`)
  })

  // Générer la tile rectangulaire Microsoft
  const rectTileSvg = createBaseSVG(310, `
    <rect width="310" height="150" fill="url(#grad1)"/>
    <text x="155" y="75" text-anchor="middle" dominant-baseline="middle" font-size="60" font-weight="bold" font-family="system-ui, sans-serif" fill="${colors.text}">Lotysis</text>
  `)
  fs.writeFileSync(path.join(publicDir, 'mstile-310x150.png.svg'), rectTileSvg)
  console.log('  ✓ mstile-310x150.png.svg')

  // Générer les splash screens Apple
  console.log('📱 Génération des splash screens Apple...')
  iconSizes.appleSplash.forEach(({ width, height, name }) => {
    const svg = createSplashScreen(width, height)
    fs.writeFileSync(path.join(publicDir, `apple-splash-${width}-${height}.png.svg`), svg)
    console.log(`  ✓ apple-splash-${width}-${height}.png.svg (${name})`)
  })

  // Générer le favicon principal
  const faviconSvg = createFaviconSVG()
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg)
  console.log('  ✓ favicon.svg')

  // Générer l'icône Safari pinned tab
  const safariSvg = createSafariIcon()
  fs.writeFileSync(path.join(publicDir, 'safari-pinned-tab.svg'), safariSvg)
  console.log('  ✓ safari-pinned-tab.svg')

  // Générer l'image OG
  const ogSvg = createSplashScreen(1200, 630)
  fs.writeFileSync(path.join(publicDir, 'og-image.svg'), ogSvg)
  console.log('  ✓ og-image.svg')

  // Générer les icônes de raccourcis
  console.log('🔗 Génération des icônes de raccourcis...')
  const shortcuts = [
    { name: 'results', icon: '📊' },
    { name: 'predictions', icon: '🔮' },
    { name: 'statistics', icon: '📈' }
  ]

  shortcuts.forEach(({ name, icon }) => {
    const svg = createBaseSVG(96, `
      <rect width="96" height="96" rx="19" ry="19" fill="url(#grad1)"/>
      <text x="48" y="58" text-anchor="middle" dominant-baseline="middle" font-size="40" fill="${colors.text}">${icon}</text>
    `)
    fs.writeFileSync(path.join(publicDir, `shortcut-${name}.png.svg`), svg)
    console.log(`  ✓ shortcut-${name}.png.svg`)
  })

  console.log('\n✨ Toutes les icônes ont été générées avec succès!')
  console.log('\n📝 Note: Les fichiers .svg générés peuvent être convertis en .png en utilisant un outil comme ImageMagick ou un service en ligne.')
  console.log('\n🔧 Pour convertir automatiquement en PNG, installez ImageMagick et exécutez:')
  console.log('   npm run convert-icons')
}

// Exécuter le script
if (require.main === module) {
  generateIcons()
}

module.exports = { generateIcons }
