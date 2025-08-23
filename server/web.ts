/**
 * Web Server Process - Handles HTTP API requests only
 * For horizontal scaling, run multiple instances of this process
 */

import express from 'express';
import { logger } from './config/logger';
import { initializeTelemetry } from './monitoring/telemetry';
import { startMetricsCollection } from './monitoring/metrics';
import { gracefulShutdownService } from './services/GracefulShutdownService';
import { enterpriseSecurityMiddleware } from './middleware/enhancedSecurity';
import { livenessProbe, readinessProbe, deepHealthCheck } from './monitoring/health';
import cors from 'cors';

// Import routes
import { configureRoutes } from './routes/index';

async function startWebServer(): Promise<void> {
  try {
    // Initialize telemetry first
    initializeTelemetry();
    
    // Start metrics collection
    startMetricsCollection();

    const app = express();
    const port = parseInt(process.env.PORT || '5000');

    // Basic middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // CORS configuration
    app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://localhost:5000',
          /^https:\/\/.*\.replit\.app$/,
          /^https:\/\/.*\.repl\.co$/,
        ].filter(Boolean);

        if (!origin || allowedOrigins.some(allowed => 
          typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
        )) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }));

    // Enterprise security middleware
    app.use(...enterpriseSecurityMiddleware());

    // Shutdown middleware
    app.use(gracefulShutdownService.createShutdownMiddleware());

    // Health check endpoints
    app.get('/healthz', livenessProbe);
    app.get('/readyz', readinessProbe);
    app.get('/health/deep', deepHealthCheck);

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      const { getMetricsRegistry } = await import('./monitoring/metrics');
      res.set('Content-Type', getMetricsRegistry().contentType);
      res.end(getMetricsRegistry().metrics());
    });

    // Configure application routes
    await configureRoutes(app);

    // Global error handler
    app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error({
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      }, 'Unhandled error in web server');

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        });
      }
    });

    // Start HTTP server
    const server = app.listen(port, '0.0.0.0', () => {
      logger.info({
        port,
        process: 'web',
        mode: process.env.NODE_ENV || 'development',
      }, 'Web server started successfully');
    });

    // Configure server settings
    server.timeout = 120000; // 2 minutes timeout for long PDF generation
    server.keepAliveTimeout = 65000; // Keep alive timeout
    server.headersTimeout = 66000; // Headers timeout

    // Handle server shutdown
    gracefulShutdownService.setShutdownTimeout(45000); // 45 seconds for web server

    // Log successful startup
    logger.info({
      process: 'web',
      port,
      environment: process.env.NODE_ENV,
      features: ['api', 'health_checks', 'metrics', 'security'],
    }, 'Web server process initialized');

  } catch (error) {
    logger.error({ error }, 'Failed to start web server');
    process.exit(1);
  }
}

// Start web server if this file is run directly
if (require.main === module) {
  startWebServer().catch((error) => {
    logger.error({ error }, 'Web server startup failed');
    process.exit(1);
  });
}

export { startWebServer };