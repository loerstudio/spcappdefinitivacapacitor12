#!/bin/bash

echo "🚀 Avvio SPC Personal Training App"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trovato. Installa Node.js da https://nodejs.org${NC}"
    exit 1
fi

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo -e "${RED}❌ Flutter non trovato. Installa Flutter da https://flutter.dev${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Controllo dipendenze...${NC}"

# Install backend dependencies
cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 Installazione dipendenze backend...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Errore installazione dipendenze backend${NC}"
        exit 1
    fi
fi

# Initialize database if not exists
if [ ! -f "database/spc.db" ]; then
    echo -e "${YELLOW}🗃️  Inizializzazione database...${NC}"
    node scripts/init-database.js
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Errore inizializzazione database${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Backend pronto${NC}"

# Install Flutter dependencies
cd ..
echo -e "${YELLOW}📥 Installazione dipendenze Flutter...${NC}"
flutter pub get
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Errore installazione dipendenze Flutter${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Flutter pronto${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}🌐 Avvio backend su http://localhost:3000${NC}"
cd backend
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend avviato con successo${NC}"
else
    echo -e "${RED}❌ Errore avvio backend${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${BLUE}📱 Avvio app Flutter...${NC}"
cd ..

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Spegnimento servizi...${NC}"
    kill $BACKEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Servizi spenti${NC}"
    exit 0
}

# Trap signals for cleanup
trap cleanup SIGINT SIGTERM

# Start Flutter app
flutter run

# If we get here, Flutter app ended, so cleanup
cleanup