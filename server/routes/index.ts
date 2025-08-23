import { Router, type Express } from 'express';
import { createServer, type Server } from 'http';
import { logger, logAPI } from '../config/logger';

// Import feature routers
import suppliersRouter from './features/suppliers';
import supplierProductsRouter from './features/supplier-products';
import reportsRouter from './features/reports';
import authRouter from './features/auth';
import greenwashRouter from './features/greenwash';

// Import existing routers
import { adminRouter } from './admin';
import objectStorageRouter from './objectStorage';
import { setupOnboardingRoutes } from './onboarding';

/**
 * Main router coordinator that combines all feature routers
 * This replaces the monolithic routes.ts structure
 */
export function setupFeatureRoutes(app: Express): void {
  // Authentication routes
  app.use('/api/auth', authRouter);
  
  // Supplier management routes
  app.use('/api/suppliers', suppliersRouter);
  app.use('/api/supplier-products', supplierProductsRouter);
  
  // Sustainability reporting routes
  app.use('/api/reports', reportsRouter);
  
  // Greenwash Guardian routes
  app.use('/api/greenwash-guardian', greenwashRouter);
  
  // Admin routes (existing modular router)
  app.use('/api/admin', adminRouter);
  
  // Object storage routes (existing modular router)  
  app.use('/api/objects', objectStorageRouter);
  
  // Onboarding routes (existing modular setup)
  setupOnboardingRoutes(app);
  
  logger.info({}, 'Feature routes configured successfully');
}

/**
 * Enhanced registerRoutes function with feature router support
 * Maintains backward compatibility while using new structure
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Set up feature routes first
  setupFeatureRoutes(app);
  
  // WebSocket setup
  const server = createServer(app);
  
  // Add any remaining legacy routes from original routes.ts
  // These will be gradually migrated to feature routers
  
  logger.info({ port: process.env.PORT || 5000 }, 'HTTP server configured with feature routers');
  
  return server;
}

export { setupFeatureRoutes as default };