import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes.js';
import { auditLog, errorHandler, notFound, rateLimit } from './middleware/auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
app.use(auditLog);

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
