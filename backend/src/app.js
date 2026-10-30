import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ENV } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import authorRoutes from './routes/authorRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxies (Render, Vercel)
  app.set('trust proxy', 1);

  // Security Headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS Configuration
  const allowedOrigins = ENV.CLIENT_URL ? ENV.CLIENT_URL.split(',').map((u) => u.trim()) : ['http://localhost:5173'];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or matching client url
        if (!origin || allowedOrigins.includes(origin) || ENV.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Logging
  if (ENV.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate Limiting
  app.use('/api/', apiLimiter);

  // Swagger Documentation
  const swaggerDocPath = path.resolve(__dirname, './docs/swagger.json');
  if (fs.existsSync(swaggerDocPath)) {
    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerDocPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  }

  // Health check routes
  app.use('/health', healthRoutes);
  app.use('/api/v1/health', healthRoutes);

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/authors', authorRoutes);
  app.use('/api/v1/tickets', ticketRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
