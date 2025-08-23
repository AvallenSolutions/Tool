import { Router } from 'express';
import { logger, logAuth } from '../../config/logger';

const router = Router();

// GET /api/auth/user - Get current user information
router.get('/user', async (req, res) => {
  try {
    // Development mode: return admin user for tim@avallen.solutions
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      const adminUser = {
        id: '44886248',
        email: 'tim@avallen.solutions',
        firstName: 'Tim',
        lastName: 'Admin',
        profileImageUrl: '',
        role: 'admin'
      };
      
      logAuth('development_admin_access', { id: adminUser.id, email: adminUser.email });
      return res.json(adminUser);
    }
    
    // Production: Use actual authentication
    if (req.user) {
      logAuth('authenticated_user_access', { 
        id: req.user.id, 
        email: req.user.email 
      });
      res.json(req.user);
    } else {
      logAuth('unauthenticated_access');
      res.status(401).json({ error: 'Not authenticated' });
    }
    
  } catch (error) {
    logger.error({ error, route: '/api/auth/user' }, 'Failed to get user information');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - User login (handled by Replit Auth middleware)
router.post('/login', (req, res) => {
  // This endpoint is typically handled by authentication middleware
  // But we include it for completeness
  logAuth('login_attempt', undefined, { ip: req.ip });
  res.status(200).json({ message: 'Login handled by authentication middleware' });
});

// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
  try {
    const user = req.user;
    
    if (user) {
      logAuth('logout', { id: user.id, email: user.email });
    }
    
    // Clear session/cookies
    req.logout?.(() => {
      res.json({ message: 'Logged out successfully' });
    });
    
  } catch (error) {
    logger.error({ error, route: '/api/auth/logout' }, 'Failed to logout user');
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;