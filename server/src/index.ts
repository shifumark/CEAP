import express from 'express';
import cors from 'cors';
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
  console.log('');
  console.log('Test credentials:');
  console.log('  Super Admin: superadmin@example.com / password123');
  console.log('  Admin:       admin@example.com / password123');
  console.log('  Applicant:   applicant@example.com / password123');
});
