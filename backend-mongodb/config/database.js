const mongoose = require('mongoose');
const Redis = require('ioredis');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class Database {
  constructor() {
    this.mongoose = mongoose;
    this.redis = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }

  async connectMongoDB() {
    try {
      // MongoDB connection options for enterprise-level performance
      const options = {
        maxPoolSize: parseInt(process.env.MONGO_CONNECTION_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        retryWrites: true,
        retryReads: true,
        readPreference: 'primaryPreferred',
        writeConcern: {
          w: 'majority',
          j: true,
          wtimeout: 30000
        }
      };

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI, options);
      
      this.isConnected = true;
      logger.info('✅ MongoDB connected successfully');
      
      // Set up connection event handlers
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
        this.reconnect();
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('✅ MongoDB reconnected');
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return true;
    } catch (error) {
      logger.error('❌ MongoDB connection failed:', error);
      this.connectionAttempts++;
      
      if (this.connectionAttempts < this.maxRetries) {
        logger.info(`🔄 Retrying connection (${this.connectionAttempts}/${this.maxRetries})...`);
        await this.delay(5000);
        return this.connectMongoDB();
      }
      
      throw error;
    }
  }

  async connectRedis() {
    try {
      // Redis connection options for high performance
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      };

      this.redis = new Redis(redisOptions);

      this.redis.on('connect', () => {
        logger.info('✅ Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        logger.error('❌ Redis connection error:', error);
      });

      this.redis.on('close', () => {
        logger.warn('⚠️ Redis connection closed');
      });

      await this.redis.connect();
      return true;
    } catch (error) {
      logger.warn('⚠️ Redis connection failed (optional):', error.message);
      return false;
    }
  }

  async connect() {
    try {
      // Connect to MongoDB (required)
      await this.connectMongoDB();
      
      // Connect to Redis (optional, for caching)
      await this.connectRedis();
      
      return true;
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.redis) {
        await this.redis.quit();
        logger.info('✅ Redis disconnected');
      }
      
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        logger.info('✅ MongoDB disconnected');
      }
    } catch (error) {
      logger.error('❌ Error during disconnect:', error);
    }
  }

  async reconnect() {
    if (this.connectionAttempts < this.maxRetries && !this.isConnected) {
      try {
        await this.delay(5000);
        await this.connectMongoDB();
      } catch (error) {
        logger.error('❌ Reconnection failed:', error);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check
  async healthCheck() {
    const health = {
      mongodb: false,
      redis: false,
      timestamp: new Date()
    };

    try {
      // Check MongoDB
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        health.mongodb = true;
      }
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
    }

    try {
      // Check Redis
      if (this.redis && this.redis.status === 'ready') {
        await this.redis.ping();
        health.redis = true;
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }

    return health;
  }

  // Cache methods
  async getCache(key) {
    if (!this.redis) return null;
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async setCache(key, value, ttl = 3600) {
    if (!this.redis) return false;
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async deleteCache(key) {
    if (!this.redis) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async flushCache() {
    if (!this.redis) return false;
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = {
        mongodb: {},
        redis: {},
        collections: {}
      };

      // MongoDB stats
      if (mongoose.connection.readyState === 1) {
        const db = mongoose.connection.db;
        const dbStats = await db.stats();
        stats.mongodb = {
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize,
          documents: dbStats.objects
        };

        // Collection stats
        const collections = await db.listCollections().toArray();
        for (const col of collections) {
          const colStats = await db.collection(col.name).stats();
          stats.collections[col.name] = {
            documents: colStats.count,
            size: colStats.size,
            avgObjSize: colStats.avgObjSize
          };
        }
      }

      // Redis stats
      if (this.redis && this.redis.status === 'ready') {
        const info = await this.redis.info('memory');
        const keyspace = await this.redis.info('keyspace');
        stats.redis = {
          memory: info,
          keyspace: keyspace
        };
      }

      return stats;
    } catch (error) {
      logger.error('Get stats error:', error);
      return null;
    }
  }
}

module.exports = new Database();