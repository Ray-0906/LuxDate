import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import env from './src/config/env.js';
import connectDB from './src/config/db.js';
import corsOptions from './src/config/cors.js';
import { initSocket } from './src/config/socket.js';
import initSocketHandlers from './src/socket/index.js';

import { apiLimiter } from './src/middleware/rateLimiter.middleware.js';
import errorHandler from './src/middleware/errorHandler.middleware.js';
import logger from './src/utils/logger.js';

// Route imports
import authRoutes from './src/routes/auth.routes.js';
import adminAuthRoutes from './src/routes/admin/admin.auth.routes.js';
import adminGirlRoutes from './src/routes/admin/admin.girl.routes.js';
import adminUserRoutes from './src/routes/admin/admin.user.routes.js';
import adminChatRoutes from './src/routes/admin/admin.chat.routes.js';
import adminGiftRoutes from './src/routes/admin/admin.gift.routes.js';
import adminVipRoutes from './src/routes/admin/admin.vip.routes.js';
import adminSettingsRoutes from './src/routes/admin/admin.settings.routes.js';
import feedRoutes from './src/routes/feed.routes.js';
import userRoutes from './src/routes/user.routes.js';
import chatRoutes from './src/routes/chat.routes.js';

import paymentRoutes from './src/routes/payment.routes.js';
import giftRoutes from './src/routes/gift.routes.js';
import videoCallRoutes from './src/routes/videoCall.routes.js';
import vipRoutes from './src/routes/vip.routes.js';
import coinRoutes from './src/routes/coin.routes.js';

// ─── App Setup ──────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ─── Security & Parsing Middleware ──────────────────────
app.use(helmet({ crossOriginResourcePolicy: false })); // allow images/videos to be loaded cross-origin
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ─── Rate Limiting ──────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Request Logging ────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'LuxDate API is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/girls', adminGirlRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/chat', adminChatRoutes);
app.use('/api/admin/gifts', adminGiftRoutes);
app.use('/api/admin/vip', adminVipRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

app.use('/api/payments', paymentRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/calls', videoCallRoutes);
app.use('/api/vip', vipRoutes);
app.use('/api/coins', coinRoutes);

// ─── 404 Handler ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler (must be last) ────────────────
app.use(errorHandler);

// ─── Socket.IO Setup ────────────────────────────────────
const io = initSocket(httpServer);
initSocketHandlers(io);

// ─── Start Server ───────────────────────────────────────
const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    httpServer.listen(env.port, () => {
      logger.info(`🚀 LuxDate Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

// ─── Graceful Shutdown ──────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);

  httpServer.close(async () => {
    const { disconnectDB } = await import('./src/config/db.js');
    await disconnectDB();
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

start();
