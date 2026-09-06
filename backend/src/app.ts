import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.routes';
import salonRouter from './routes/salon.routes';
import queueRouter from './routes/queue.routes';
import appointmentRouter from './routes/appointment.routes';
import barberRouter from './routes/barber.routes';
import notificationRouter from './routes/notification.routes';
import { reviewRouter, adminRouter } from './routes/admin.routes';

export function createApp() {
  const app = express();

  // ─── SECURITY ──────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests without an Origin header (Postman, mobile apps, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Allow all localhost and 127.0.0.1 ports during development
        if (
          /^http:\/\/localhost:\d+$/.test(origin) ||
          /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
        ) {
          return callback(null, true);
        }

        // Allow the production frontend URL if configured
        if (origin === process.env.FRONTEND_URL) {
          return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // ─── RATE LIMITING ─────────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
    })
  );

  // Stricter OTP rate limit
  app.use(
    '/api/auth/otp',
    rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: { success: false, error: 'Too many OTP requests.' } })
  );

  // ─── BODY PARSING ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── LOGGING ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // ─── HEALTH CHECK ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'TrimTown API' });
  });

  // ─── API ROUTES ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/salons', salonRouter);
  app.use('/api/queue', queueRouter);
  app.use('/api/appointments', appointmentRouter);
  app.use('/api/barbers', barberRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/reviews', reviewRouter);
  app.use('/api/admin', adminRouter);

  // ─── 404 ───────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  // ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Error]', err);
    res.status(err.status || 500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return app;
}
