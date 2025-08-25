import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { lcaService } from "./lca";
import path from "path";
import { initializeSentry } from "./config/sentry";
import { initializeMixpanel } from "./config/mixpanel";
import { logger, createRequestLogger, logAPI } from "./config/logger.js";

// Initialize monitoring services first
initializeSentry();
initializeMixpanel();

const app = express();

// Security middleware with environment-aware CSP
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = isDevelopment 
  ? ["http://localhost:5000", "http://localhost:5173"]
  : ["'self'", "https:", process.env.FRONTEND_URL].filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", ...allowedOrigins],
      connectSrc: ["'self'", "https:", ...allowedOrigins],
    },
  },
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development - limit each IP to 1000 requests per windowMs
  message: 'Too many API requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Environment-aware CORS configuration
app.use((req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigin = isDevelopment 
    ? 'http://localhost:5173' 
    : process.env.FRONTEND_URL || req.get('origin') || '*';
    
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string || Date.now().toString();
  const requestLogger = createRequestLogger(requestId);
  
  // Add request logger to request object for use in routes
  (req as any).logger = requestLogger;
  res.setHeader('x-request-id', requestId);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      logAPI(req.method, req.path, res.statusCode, duration, {
        requestId,
        userAgent: req.get('user-agent'),
        contentLength: res.get('content-length'),
        referer: req.get('referer')
      });
    }
  });

  next();
});

(async () => {
  // Initialize LCA service (graceful fallback if OpenLCA not available)
  try {
    await lcaService.initialize();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: errorMessage }, "LCA service initialization failed (OpenLCA may not be available)");
  }
  
  // Initialize OpenLCA ingredient mappings
  try {
    const { OpenLCAService } = await import('./services/OpenLCAService');
    await OpenLCAService.initializeCommonIngredients();
  } catch (error) {
    logger.warn({ error }, "Failed to initialize ingredient mappings");
  }
  
  // Import the new modular router system
  const { registerRoutes: registerModularRoutes } = await import('./routes/index.js');
  
  // Use new modular routes first, then fall back to legacy routes
  const server = await registerModularRoutes(app);
  
  // Import legacy routes for remaining endpoints (temporary during migration)
  const { registerRoutes: registerLegacyRoutes } = await import('./routes.js');
  await registerLegacyRoutes(app);
  
  // Add sample report route
  app.get('/sample-report', (req, res) => {
    const filePath = path.join(process.cwd(), 'sample_enhanced_report.html');
    res.sendFile(filePath);
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
