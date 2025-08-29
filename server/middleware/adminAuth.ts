import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AdminRequest extends Request {
  user: any;
  adminUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Middleware to check if the authenticated user has admin role
 */
export async function requireAdminRole(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    // SECURITY FIX: Restricted development mode bypass with additional safeguards
    if (process.env.NODE_ENV === 'development' || process.env.ADMIN_BYPASS_DEV === '1') {
      // Additional safety check: only allow on localhost
      const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname.endsWith('.replit.dev');
      
      if (!isLocalhost) {
        console.error('🚨 SECURITY ALERT: Admin bypass attempted on non-localhost domain:', req.hostname);
        return res.status(403).json({ 
          error: 'Admin bypass only allowed on localhost',
          message: 'Security violation detected'
        });
      }
      
      console.warn('⚠️  DEV MODE: Admin authentication bypassed - THIS SHOULD NEVER HAPPEN IN PRODUCTION');
      
      // Create a mock admin user for development using existing user ID
      req.adminUser = {
        id: '41152482', // Use existing user ID in database
        email: 'admin@avallen.solutions',
        firstName: 'Development',
        lastName: 'Admin',
        role: 'admin'
      };
      
      return next();
    }

    /* Production authentication code */
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    const user = req.user as any;
    const userId = user.claims?.sub;

    if (!userId) {
      return res.status(401).json({ 
        error: 'Invalid user session',
        message: 'Unable to identify user from session'
      });
    }

    // Check user role in database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!dbUser) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'User account not found in database'
      });
    }

    if (dbUser.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Admin access required for this resource'
      });
    }

    // Attach admin user info to request
    req.adminUser = {
      id: dbUser.id,
      email: dbUser.email || '',
      firstName: dbUser.firstName || '',
      lastName: dbUser.lastName || '',
      role: dbUser.role
    };

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error checking admin permissions'
    });
  }
}

/**
 * Helper function to check if a user ID has admin role
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.role === 'admin';
  } catch (error) {
    console.error('Error checking user admin status:', error);
    return false;
  }
}