const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database and models
const database = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workoutRoutes = require('./routes/workouts');
const nutritionRoutes = require('./routes/nutrition');
const chatRoutes = require('./routes/chat');
const progressRoutes = require('./routes/progress');
const uploadRoutes = require('./routes/upload');
const analyticsRoutes = require('./routes/analytics');

// Import socket handlers
const initChatSocket = require('./sockets/chat');

const app = express();
const server = createServer(app);

// Socket.IO setup with enterprise configuration
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: process.env.SOCKET_TRANSPORTS?.split(',') || ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true
});

// Make io available to routes
app.locals.io = io;

// Trust proxy for production deployment
app.set('trust proxy', 1);

// Security Middleware
if (process.env.HELMET_ENABLED !== 'false') {
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    }
  }));
}

// MongoDB sanitization
if (process.env.MONGO_SANITIZE_ENABLED !== 'false') {
  app.use(mongoSanitize());
}

// Prevent parameter pollution
app.use(hpp());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
if (process.env.COMPRESSION_ENABLED !== 'false') {
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024 // Only compress if response is larger than 1KB
  }));
}

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate limiting with different tiers
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { 
      success: false, 
      message 
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
  });
};

// General API rate limit
app.use('/api/', createRateLimit(
  (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  process.env.RATE_LIMIT_MAX || 1000,
  'Troppi tentativi, riprova tra qualche minuto'
));

// Strict rate limit for auth endpoints
app.use('/api/auth/login', createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 login attempts per 15 minutes
  'Troppi tentativi di login, riprova tra 15 minuti'
));

app.use('/api/auth/register', createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 registrations per hour
  'Troppi tentativi di registrazione, riprova tra un\'ora'
));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'JSON malformato'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Static file serving
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint (before auth middleware)
app.get('/api/health', async (req, res) => {
  try {
    const health = await database.healthCheck();
    const stats = await database.getStats();
    
    res.json({
      success: true,
      status: 'OK',
      message: 'SPC Backend API MongoDB Enterprise is running',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: health,
      stats: stats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'ERROR',
      message: 'Service temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    title: 'SPC Personal Training API Documentation',
    version: '2.0.0',
    description: 'Enterprise-grade MongoDB API for Personal Training Management',
    endpoints: {
      authentication: [
        'POST /api/auth/register - User registration',
        'POST /api/auth/login - User login',
        'GET /api/auth/verify - Verify JWT token',
        'POST /api/auth/logout - User logout',
        'PUT /api/auth/change-password - Change password'
      ],
      users: [
        'GET /api/users/trainer/:id/clients - Get trainer clients',
        'POST /api/users/trainer/:id/clients - Add new client',
        'PUT /api/users/clients/:id - Update client',
        'DELETE /api/users/clients/:id - Delete client',
        'GET /api/users/search - Search users'
      ],
      workouts: [
        'GET /api/workouts/trainer/:id/programs - Get trainer programs',
        'POST /api/workouts/programs - Create workout program',
        'GET /api/workouts/programs/:id - Get program details',
        'POST /api/workouts/sessions - Start workout session'
      ],
      chat: [
        'GET /api/chat/conversations - Get user conversations',
        'GET /api/chat/messages/:userId - Get messages',
        'POST /api/chat/messages - Send message'
      ],
      upload: [
        'POST /api/upload/:type - Upload single file',
        'POST /api/upload/:type/multiple - Upload multiple files',
        'DELETE /api/upload/:type/:filename - Delete file'
      ]
    },
    websocket: {
      url: 'ws://localhost:3000',
      events: [
        'new_message - Real-time message delivery',
        'user_typing - Typing indicators',
        'user_status_change - Online/offline status'
      ]
    }
  });
});

// Initialize Socket.IO with chat handlers
initChatSocket(io);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // MongoDB/Mongoose errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Errori di validazione',
      errors
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID non valido'
    });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} già esistente`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token non valido'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token scaduto'
    });
  }
  
  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File troppo grande'
    });
  }
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Errore interno del server',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} non trovato`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received. Starting graceful shutdown...');
  
  server.close(async () => {
    console.log('⏹️  HTTP server closed');
    
    try {
      await database.disconnect();
      console.log('✅ Database disconnected');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Starting graceful shutdown...');
  
  server.close(async () => {
    console.log('⏹️  HTTP server closed');
    
    try {
      await database.disconnect();
      console.log('✅ Database disconnected');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
});

// Unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database first
    console.log('🔗 Connecting to database...');
    await database.connect();
    
    // Start HTTP server
    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 SPC Backend API MongoDB Enterprise');
      console.log('='.repeat(60));
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🗃️  Database: MongoDB ${database.mongoose.version}`);
      console.log(`🔄 Redis: ${database.redis ? 'Connected' : 'Disabled'}`);
      console.log(`💬 Socket.IO: Enabled`);
      console.log(`📁 Uploads: ${uploadsPath}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Health: http://localhost:${PORT}/api/health`);
      console.log(`📖 Docs: http://localhost:${PORT}/api/docs`);
      console.log('='.repeat(60));
      console.log('✅ Ready for connections!\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = { app, server, io };