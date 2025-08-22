# SPC Backend API

Backend API Node.js + SQLite per l'app Personal Trainer SPC.

## 🚀 Avvio Rapido

```bash
# Entra nella directory backend
cd backend

# Avvia tutto automaticamente (installa dipendenze, crea database, avvia server)
node start.js
```

## 🛠️ Installazione Manuale

```bash
# Installa dipendenze
npm install

# Inizializza database
npm run init-db

# Avvia server
npm start
```

## 🗃️ Database

- **Tipo**: SQLite
- **Posizione**: `./database/spc.db`
- **Backup automatico**: Si

### Credenziali Demo

- **Trainer**: `trainer@demo.com` / `password`
- **Cliente**: `client@demo.com` / `password`

## 📡 API Endpoints

### Autenticazione
- `POST /api/auth/register` - Registrazione
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verifica token
- `POST /api/auth/logout` - Logout

### Utenti
- `GET /api/users/trainer/:id/clients` - Clienti del trainer
- `POST /api/users/trainer/:id/clients` - Aggiungi cliente
- `PUT /api/users/clients/:id` - Aggiorna cliente
- `DELETE /api/users/clients/:id` - Elimina cliente

### Allenamenti
- `GET /api/workouts/trainer/:id/programs` - Programmi trainer
- `POST /api/workouts/programs` - Crea programma
- `GET /api/workouts/programs/:id` - Dettagli programma
- `POST /api/workouts/programs/:id/days` - Aggiungi giorno
- `POST /api/workouts/days/:id/exercises` - Aggiungi esercizio

### Nutrizione
- `GET /api/nutrition/trainer/:id/plans` - Piani nutrizionali
- `POST /api/nutrition/plans` - Crea piano
- `GET /api/nutrition/plans/:id` - Dettagli piano
- `POST /api/nutrition/food-logs` - Log alimentare

### Chat
- `GET /api/chat/conversations` - Conversazioni
- `GET /api/chat/messages/:userId` - Messaggi
- `POST /api/chat/messages` - Invia messaggio

### Progressi
- `GET /api/progress/client/:id` - Progressi cliente
- `POST /api/progress/entries` - Aggiungi progresso
- `GET /api/progress/client/:id/stats` - Statistiche

### Upload
- `POST /api/upload/:type` - Upload singolo file
- `POST /api/upload/:type/multiple` - Upload multipli
- `DELETE /api/upload/:type/:filename` - Elimina file

## 🔒 Sicurezza

- JWT Authentication
- Rate Limiting
- File Upload Validation
- SQL Injection Protection
- CORS Configuration
- Input Validation

## 🔗 WebSocket (Chat Real-time)

```javascript
// Connessione
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

// Eventi disponibili
socket.on('new_message', (message) => {});
socket.on('user_typing', (data) => {});
socket.on('message_notification', (data) => {});
```

## 📁 Struttura

```
backend/
├── config/          # Configurazione database
├── middleware/      # Middleware auth
├── routes/          # API routes
├── sockets/         # WebSocket handlers
├── scripts/         # Script utilità
├── uploads/         # File uploadati
├── database/        # Database SQLite
└── server.js        # Server principale
```

## 🌍 Variabili Ambiente

File `.env`:

```env
PORT=3000
JWT_SECRET=your-secret-key
DB_PATH=./database/spc.db
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

## 🧪 Test API

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trainer@demo.com","password":"password"}'
```

## 📋 Logs

I log vengono visualizzati in console e includono:
- Connessioni database
- Richieste API
- Errori
- WebSocket eventi

## 🔧 Sviluppo

```bash
# Modalità sviluppo con auto-restart
npm run dev

# Reset database
rm database/spc.db && npm run init-db

# Backup database
cp database/spc.db database/backup_$(date +%Y%m%d_%H%M%S).db
```

## ⚡ Performance

- SQLite ottimizzato con indici
- Connection pooling
- Response caching
- File upload streaming
- Rate limiting configurabile

## 🐛 Troubleshooting

### Porta già in uso
```bash
# Trova processo sulla porta 3000
lsof -i :3000

# Termina processo
kill -9 <PID>
```

### Database locked
```bash
# Chiudi tutte le connessioni e riavvia
pkill -f "node server.js"
node start.js
```

### Permessi file
```bash
# Dai permessi alla directory uploads
chmod -R 755 uploads/
```

---

**Stato**: ✅ Pronto per produzione
**Versione**: 1.0.0
**Ultimo aggiornamento**: Agosto 2025