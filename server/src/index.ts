import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes.js';
import { auditLog, errorHandler, notFound, rateLimit } from './middleware/auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Render (and most PaaS hosts) sit in front of the app behind a reverse
// proxy — without this, req.ip resolves to the proxy's address for every
// request instead of the real client IP, which silently breaks any
// per-IP logic (rate limiting below) by bucketing all traffic together.
app.set('trust proxy', 1);

// This is a JSON/file API with no HTML rendering of its own — the
// default Content-Security-Policy target (browser-rendered pages) does
// not apply here and risks unexpected interference, so it's disabled.
// Cross-Origin-Resource-Policy is relaxed since the whole point of this
// API is to be fetched cross-origin by the GitHub Pages frontend (CORS
// below already gates *which* origin may do that). Everything else
// (nosniff, frameguard, hsts, hidden X-Powered-By, etc.) stays on.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);

// Health check — deliberately mounted before the rate limiter and
// request-parsing middleware. Render polls this frequently to decide
// whether to restart the instance; if it ever counted against the rate
// limit, the health check itself could trip a 429 and cause a
// fail-restart-fail crash loop (this happened in production once).
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
app.use(auditLog);

// Routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`✓ Server running on http://localhost:${port}`);
  console.log(`✓ API available at http://localhost:${port}/api`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log('');
    console.log('Test credentials (local dev only — run `npm run db:seed` to create them):');
    console.log('  Super Admin: superadmin@example.com / password123');
    console.log('  Admin:       admin@example.com / password123');
    console.log('  Applicant:   applicant@example.com / password123');
  }
});
