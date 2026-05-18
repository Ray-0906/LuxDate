import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const razorpayKeyIdTrimmed = (process.env.RAZORPAY_KEY_ID || '').trim();
const paymentMockEnv = process.env.PAYMENT_MOCK;
const explicitPaymentMock = paymentMockEnv === 'true';
const explicitPaymentMockOff = paymentMockEnv === 'false';
const devAutoPaymentMock =
  !explicitPaymentMockOff && nodeEnv === 'development' && !razorpayKeyIdTrimmed;
const paymentMockAllowProd = process.env.PAYMENT_MOCK_ALLOW_PROD === 'true';
const mongoTransactionsEnv = (process.env.MONGO_USE_TRANSACTIONS || '').trim().toLowerCase();
const mongoTransactionsEnabled = mongoTransactionsEnv === 'false' ? false : true;
/** True when mock gateway should be used for new orders (see seedDefaultGateway). */
const paymentMockEnabled = isProd
  ? explicitPaymentMock && paymentMockAllowProd
  : explicitPaymentMock || devAutoPaymentMock;

const env = {
  // App
  nodeEnv,
  port: parseInt(process.env.PORT, 10) || 5000,
  isDev: nodeEnv === 'development',
  isProd,
  paymentMockEnabled,
  paymentMockAllowProd,

  // MongoDB
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/luxdate',
  mongoTransactionsEnabled,

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },

  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  // Cashfree
  cashfree: {
    appId: process.env.CASHFREE_APP_ID || '',
    secretKey: process.env.CASHFREE_SECRET_KEY || '',
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default env;
