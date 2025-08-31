import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAdminRole } from '../middleware/adminAuth';

describe('Authentication Middleware', () => {
  let app: express.Application;
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    app = express();
    mockReq = {
      hostname: 'localhost',
      ip: '127.0.0.1',
      get: vi.fn(),
      isAuthenticated: vi.fn(),
      user: null
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    mockNext = vi.fn();
    
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.REPLIT_DB_URL;
    delete process.env.ADMIN_BYPASS_DEV;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Development Mode Security', () => {
    it('should reject admin bypass on non-localhost domains', async () => {
      process.env.NODE_ENV = 'development';
      process.env.REPLIT_DB_URL = 'postgresql://localhost:5432/test';
      mockReq.hostname = 'malicious-site.com';

      await requireAdminRole(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized access attempt',
        message: 'Admin access restricted to development environments only'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow bypass on Replit development domains', async () => {
      process.env.NODE_ENV = 'development';
      process.env.REPLIT_DB_URL = 'postgresql://localhost:5432/test';
      process.env.REPL_OWNER = 'testowner';
      process.env.REPL_SLUG = 'testslug';
      mockReq.hostname = 'test.replit.dev';

      await requireAdminRole(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.adminUser).toBeDefined();
      expect(mockReq.adminUser.email).toBe('tim@avallen.solutions');
    });

    it('should require production authentication when not in development', async () => {
      process.env.NODE_ENV = 'production';
      mockReq.isAuthenticated = vi.fn().mockReturnValue(false);

      await requireAdminRole(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    });
  });

  describe('Production Authentication', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should require valid user session', async () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(false);

      await requireAdminRole(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require valid user ID in session', async () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = { claims: {} }; // Missing sub claim

      await requireAdminRole(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid user session',
        message: 'Unable to identify user from session'
      });
    });
  });
});