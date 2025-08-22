#!/usr/bin/env node

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🍃 MongoDB Enterprise Setup - SPC Personal Training');
console.log('=' .repeat(60));

const platform = os.platform();
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

// Check if MongoDB is already installed
function checkMongoInstalled() {
  try {
    const version = execSync('mongod --version', { encoding: 'utf-8' });
    if (version.includes('db version')) {
      console.log('✅ MongoDB already installed');
      console.log(version.split('\n')[0]);
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// Install MongoDB based on platform
async function installMongoDB() {
  console.log('📦 Installing MongoDB...');
  
  try {
    if (isMac) {
      // macOS installation using Homebrew
      console.log('🍺 Installing MongoDB via Homebrew...');
      
      // Check if Homebrew is installed
      try {
        execSync('brew --version', { stdio: 'ignore' });
      } catch (error) {
        console.log('📥 Installing Homebrew first...');
        execSync('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', { stdio: 'inherit' });
      }
      
      // Add MongoDB tap and install
      execSync('brew tap mongodb/brew', { stdio: 'inherit' });
      execSync('brew install mongodb-community', { stdio: 'inherit' });
      
      console.log('✅ MongoDB installed successfully via Homebrew');
      
    } else if (isLinux) {
      // Linux installation (Ubuntu/Debian)
      console.log('🐧 Installing MongoDB on Linux...');
      
      // Import MongoDB GPG key
      execSync('wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -', { stdio: 'inherit' });
      
      // Add MongoDB repository
      execSync('echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list', { stdio: 'inherit' });
      
      // Update and install
      execSync('sudo apt-get update', { stdio: 'inherit' });
      execSync('sudo apt-get install -y mongodb-org', { stdio: 'inherit' });
      
      console.log('✅ MongoDB installed successfully on Linux');
      
    } else if (isWindows) {
      // Windows installation
      console.log('🪟 Windows detected');
      console.log('Please install MongoDB manually from: https://www.mongodb.com/try/download/community');
      console.log('Or use Windows Package Manager: winget install MongoDB.Server');
      
      process.exit(1);
      
    } else {
      console.log('❌ Unsupported platform:', platform);
      console.log('Please install MongoDB manually from: https://www.mongodb.com/try/download/community');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ MongoDB installation failed:', error.message);
    console.log('\n📖 Manual Installation Guide:');
    console.log('macOS: brew install mongodb-community');
    console.log('Linux: sudo apt-get install mongodb-org');
    console.log('Windows: Download from https://www.mongodb.com/try/download/community');
    process.exit(1);
  }
}

// Start MongoDB service
function startMongoDB() {
  console.log('🚀 Starting MongoDB service...');
  
  try {
    if (isMac) {
      // macOS with Homebrew
      try {
        execSync('brew services start mongodb/brew/mongodb-community', { stdio: 'inherit' });
        console.log('✅ MongoDB service started via Homebrew');
      } catch (error) {
        // Try alternative method
        execSync('sudo mongod --config /usr/local/etc/mongod.conf --fork', { stdio: 'inherit' });
        console.log('✅ MongoDB started manually');
      }
      
    } else if (isLinux) {
      // Linux systemctl
      execSync('sudo systemctl start mongod', { stdio: 'inherit' });
      execSync('sudo systemctl enable mongod', { stdio: 'inherit' });
      console.log('✅ MongoDB service started and enabled');
      
    } else {
      console.log('⚠️  Please start MongoDB manually on your system');
    }
    
  } catch (error) {
    console.log('⚠️  Could not start MongoDB automatically');
    console.log('Please start MongoDB manually:');
    console.log('macOS: brew services start mongodb-community');
    console.log('Linux: sudo systemctl start mongod');
    console.log('Windows: net start MongoDB');
  }
}

// Test MongoDB connection
async function testConnection() {
  console.log('🔗 Testing MongoDB connection...');
  
  return new Promise((resolve, reject) => {
    const { MongoClient } = require('mongodb');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    
    const client = new MongoClient(uri);
    
    client.connect()
      .then(async () => {
        console.log('✅ MongoDB connection successful');
        
        // Test database operations
        const db = client.db('spc_fitness_app');
        const collection = db.collection('test');
        
        await collection.insertOne({ test: 'connection', timestamp: new Date() });
        await collection.deleteOne({ test: 'connection' });
        
        console.log('✅ Database operations successful');
        
        await client.close();
        resolve(true);
      })
      .catch((error) => {
        console.error('❌ MongoDB connection failed:', error.message);
        reject(error);
      });
  });
}

// Create MongoDB directories and config
function createMongoDirectories() {
  console.log('📁 Creating MongoDB directories...');
  
  const mongoPath = path.join(__dirname, '..', 'mongodb');
  const dataPath = path.join(mongoPath, 'data');
  const logsPath = path.join(mongoPath, 'logs');
  
  // Create directories
  fs.mkdirSync(mongoPath, { recursive: true });
  fs.mkdirSync(dataPath, { recursive: true });
  fs.mkdirSync(logsPath, { recursive: true });
  
  // Create mongod.conf
  const configContent = `
# MongoDB configuration for SPC Personal Training App
storage:
  dbPath: ${dataPath}
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: ${logsPath}/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: disabled

setParameter:
  enableLocalhostAuthBypass: true
`;
  
  const configPath = path.join(mongoPath, 'mongod.conf');
  fs.writeFileSync(configPath, configContent.trim());
  
  console.log('✅ MongoDB directories and config created');
  return { mongoPath, dataPath, logsPath, configPath };
}

// Setup indexes for performance
async function setupIndexes() {
  console.log('📊 Setting up MongoDB indexes...');
  
  try {
    const { MongoClient } = require('mongodb');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    
    await client.connect();
    const db = client.db('spc_fitness_app');
    
    // Users collection indexes
    const usersCollection = db.collection('users');
    await usersCollection.createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { role: 1, isActive: 1 } },
      { key: { trainerId: 1 } },
      { key: { 'location.coordinates': '2dsphere' } },
      { key: { createdAt: -1 } },
      { key: { lastActivity: -1 } }
    ]);
    
    // Workout programs collection indexes
    const workoutProgramsCollection = db.collection('workoutprograms');
    await workoutProgramsCollection.createIndexes([
      { key: { trainerId: 1, isActive: 1 } },
      { key: { clientId: 1, isActive: 1 } },
      { key: { isPublic: 1, isActive: 1 } },
      { key: { programType: 1, difficulty: 1 } },
      { key: { tags: 1 } },
      { key: { createdAt: -1 } }
    ]);
    
    // Workout sessions collection indexes
    const workoutSessionsCollection = db.collection('workoutsessions');
    await workoutSessionsCollection.createIndexes([
      { key: { clientId: 1, startTime: -1 } },
      { key: { programId: 1, startTime: -1 } },
      { key: { isCompleted: 1, startTime: -1 } }
    ]);
    
    // Messages collection indexes
    const messagesCollection = db.collection('messages');
    await messagesCollection.createIndexes([
      { key: { senderId: 1, receiverId: 1, createdAt: -1 } },
      { key: { receiverId: 1, isRead: 1 } },
      { key: { createdAt: -1 } }
    ]);
    
    console.log('✅ MongoDB indexes created successfully');
    await client.close();
    
  } catch (error) {
    console.error('⚠️  Index creation failed:', error.message);
  }
}

// Main setup function
async function main() {
  try {
    // Check if MongoDB is already installed
    if (!checkMongoInstalled()) {
      await installMongoDB();
    }
    
    // Create directories and config
    const paths = createMongoDirectories();
    
    // Start MongoDB
    startMongoDB();
    
    // Wait for MongoDB to start
    console.log('⏳ Waiting for MongoDB to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test connection
    await testConnection();
    
    // Setup indexes
    await setupIndexes();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MongoDB Enterprise Setup Complete!');
    console.log('='.repeat(60));
    console.log('🗃️  Database: MongoDB Community Server');
    console.log('📡 Connection: mongodb://localhost:27017');
    console.log('🗂️  Database Name: spc_fitness_app');
    console.log('📁 Data Path:', paths.dataPath);
    console.log('📋 Logs Path:', paths.logsPath);
    console.log('⚙️  Config:', paths.configPath);
    console.log('\n🎯 Next Steps:');
    console.log('1. Run: npm install (to install Node.js dependencies)');
    console.log('2. Run: npm run seed (to populate with demo data)');
    console.log('3. Run: npm start (to start the API server)');
    console.log('\n🔧 MongoDB Management:');
    console.log('Start: brew services start mongodb-community (macOS)');
    console.log('Stop: brew services stop mongodb-community (macOS)');
    console.log('Shell: mongosh spc_fitness_app');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ MongoDB setup failed:', error.message);
    console.log('\n🛠️  Manual Setup Steps:');
    console.log('1. Install MongoDB: https://docs.mongodb.com/manual/installation/');
    console.log('2. Start MongoDB service');
    console.log('3. Create database: spc_fitness_app');
    console.log('4. Run: npm install && npm start');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { 
  installMongoDB, 
  startMongoDB, 
  testConnection, 
  setupIndexes 
};