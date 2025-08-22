#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Avvio SPC Backend API...\n');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installazione dipendenze...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Dipendenze installate con successo!\n');
  } catch (error) {
    console.error('❌ Errore nell\'installazione delle dipendenze:', error.message);
    process.exit(1);
  }
}

// Check if database exists
const dbPath = path.join(__dirname, 'database', 'spc.db');
if (!fs.existsSync(dbPath)) {
  console.log('🗃️  Inizializzazione database...');
  try {
    execSync('node scripts/init-database.js', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Database inizializzato con successo!\n');
  } catch (error) {
    console.error('❌ Errore nell\'inizializzazione del database:', error.message);
    process.exit(1);
  }
}

// Create uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 Directory uploads creata\n');
}

// Start server
console.log('🎯 Avvio server...');
try {
  execSync('node server.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('❌ Errore nell\'avvio del server:', error.message);
  process.exit(1);
}