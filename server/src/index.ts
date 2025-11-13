import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { DriftRoom } from "./rooms/DriftRoom";
import { Database } from "./database/Database";
import { createUserRoutes } from "./routes/userRoutes";
import { createSettingsRoutes } from "./routes/settingsRoutes";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { securityHeaders, sanitizeBody } from "./middleware/security";
import { logger } from "./utils/logger";

const port = (() => {
  const envPort = process.env.PORT;
  if (envPort) {
    const parsed = Number(envPort);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 2567;
})();

const host = process.env.HOST || '0.0.0.0';
const app = express();

// Trust proxy for correct IP detection behind nginx
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We set custom CSP in securityHeaders
  crossOriginEmbedderPolicy: false, // Allow WebSocket connections
}));
app.use(securityHeaders);
app.use(mongoSanitize()); // Sanitize data against NoSQL injection
app.use(sanitizeBody); // Custom input sanitization

// Initialize database
const database = new Database();

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : [
      'http://driftcash.com',
      'https://driftcash.com',
      'http://admin.driftcash.com',
      'https://admin.driftcash.com',
      'http://driftcash.com:8081',
      'http://localhost:5173'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // CRITICAL FIX #8: In production, require Origin header to prevent abuse
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[security] Rejected request without Origin header in production');
        return callback(new Error('Origin header required in production'));
      }
      // Development: allow for local testing (Postman, etc.)
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn('Rejected request from unauthorized origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Increase body size limit for image uploads (base64 images can be large)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API routes
app.use('/api/users', createUserRoutes(database));
app.use('/api/settings', createSettingsRoutes(database));

app.get("/", (_req, res) => {
  res.send("OK");
});

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 3000,
    pingMaxRetries: 2
  })
});

gameServer.define("drift", DriftRoom);

// Initialize database with seed data
async function initializeServer() {
  try {
    await database.seedInitialData();
    logger.info('Initial data seeded successfully');
  } catch (error) {
    logger.error('Error seeding initial data', error as Error);
  }

  httpServer.listen(port, host, () => {
    logger.info(`Server listening`, { host, port });
    logger.info(`REST API available at /api`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

initializeServer();

export { app, gameServer, database };
