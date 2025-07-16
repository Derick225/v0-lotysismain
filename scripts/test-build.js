#!/usr/bin/env node

/**
 * Simple build test to check for webpack errors
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Testing build for webpack errors...\n');

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found');
  process.exit(1);
}

// Check if next.config.mjs exists
if (!fs.existsSync('next.config.mjs')) {
  console.error('❌ next.config.mjs not found');
  process.exit(1);
}

// Check if tsconfig.json exists
if (!fs.existsSync('tsconfig.json')) {
  console.error('❌ tsconfig.json not found');
  process.exit(1);
}

console.log('✅ Configuration files found');

// Check for critical files
const criticalFiles = [
  'app/layout.tsx',
  'app/page.tsx',
  'components/ui/button.tsx',
  'lib/utils.ts'
];

let missingFiles = [];
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.error(`\n❌ Missing critical files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

console.log('\n🔨 Testing build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n✅ Build successful!');
} catch (error) {
  console.error('\n❌ Build failed');
  console.error('Check the error messages above for webpack issues');
  process.exit(1);
}

console.log('\n🎉 All tests passed! The application should deploy successfully.');
