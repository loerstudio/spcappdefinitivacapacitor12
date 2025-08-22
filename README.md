# SPC Flutter App - Personal Trainer & Client Management

Un'applicazione Flutter completa per la gestione di personal trainer e clienti, con interfacce separate e funzionalità specifiche per ogni ruolo.

## Caratteristiche Principali

### Per Personal Trainer:
- **Gestione Clienti**: Creazione, modifica ed eliminazione clienti
- **Programmi Allenamento**: Creazione e gestione programmi con giorni ed esercizi
- **Piani Nutrizionali**: Creazione e gestione piani alimentari personalizzati
- **Chat**: Comunicazione diretta con i clienti
- **Monitoraggio Progressi**: Visualizzazione obiettivi e progressi dei clienti
- **Dashboard**: Panoramica completa delle attività

### Per Clienti:
- **Dashboard Personale**: Panoramica attività giornaliere
- **Allenamenti**: Visualizzazione e esecuzione programmi di allenamento
- **Live Workout**: Sistema di allenamento dal vivo simile a EvolutionFit
- **Alimentazione**: Visualizzazione piani nutrizionali e tracking cibo
- **Progressi**: Monitoraggio obiettivi con foto progress
- **Chat**: Comunicazione con il personal trainer
- **Librerie**: Accesso a librerie esercizi e alimenti

## Design

L'app utilizza un tema personalizzato con colori:
- **Rosso Primario**: #FF0000
- **Bianco**: #FFFFFF  
- **Nero/Grigio**: #000000, #1A1A1A, #333333
- **Accenti**: Verde, Blu, Arancione per stati e azioni

Il design è ispirato alle UI di Hevy App e EvolutionFit Club per un'esperienza utente moderna e intuitiva.

## Struttura del Progetto

```
lib/
├── core/
│   ├── models/           # Modelli dati (User, Workout, Nutrition)
│   ├── providers/        # State management (Auth, User)
│   ├── services/         # Servizi (Auth, Storage)
│   ├── theme/           # Tema e colori dell'app
│   └── router/          # Routing e navigazione
├── features/
│   ├── auth/            # Autenticazione (Login, Register)
│   ├── trainer/         # Interfacce trainer
│   ├── client/          # Interfacce client
│   └── common/          # Componenti condivisi
└── main.dart
```

## Tecnologie Utilizzate

- **Flutter 3.0+**
- **Provider** per state management
- **Go Router** per navigazione
- **Google Fonts** per tipografia
- **Shared Preferences** per storage locale
- **HTTP/Dio** per chiamate API
- **Image Picker** per gestione immagini
- **Camera** per foto progress

## Configurazione e Avvio

1. **Installazione dipendenze:**
```bash
flutter pub get
```

2. **Avvio dell'app:**
```bash
flutter run
```

3. **Account Demo:**
- **Trainer**: `trainer@demo.com` / `password`
- **Cliente**: `client@demo.com` / `password`

## Funzionalità in Sviluppo

- [ ] Sistema workout dal vivo
- [ ] Riconoscimento AI cibo
- [ ] Chat real-time
- [ ] Sincronizzazione cloud
- [ ] Notifiche push
- [ ] Analytics avanzate
- [ ] Sistema pagamenti
- [ ] Integrazione wearables

## Contributi

Il progetto è in fase di sviluppo attivo. Per contribuire:

1. Fork del repository
2. Creazione feature branch
3. Commit delle modifiche
4. Push e apertura Pull Request

## Licenza

Questo progetto è proprietario di Simone Pagno Coaching.

---

**Versione**: 1.0.0
**Ultimo aggiornamento**: Agosto 2025