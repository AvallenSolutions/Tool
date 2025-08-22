# Deployment Guide

## Environment Variables Required for Production

### Essential Configuration
```bash
# Database (Required)
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication (Required)
REPLIT_DOMAINS="your-production-domain.com"

# Frontend URL (Required for CORS)
FRONTEND_URL="https://your-frontend-domain.com"

# API Keys (Optional - some features may not work without them)
OPENAI_API_KEY="sk-..."                    # For AI-powered features
STRIPE_SECRET_KEY="sk_live_..."            # For payment processing
OPENLCA_API_KEY=""                         # For LCA integration (if available)
OPENLCA_SERVER_URL=""                      # For LCA integration (if available)

# reCAPTCHA (Optional - login will work without CAPTCHA in production)
VITE_RECAPTCHA_SITE_KEY="6Le..."          # Frontend reCAPTCHA site key

# Production Settings
NODE_ENV="production"
PORT="5000"                                # Or your preferred port
```

### Key Security Features Already Implemented
- ✅ Environment-aware CORS configuration
- ✅ Content Security Policy with production/development modes
- ✅ Rate limiting on API endpoints (100 requests per 15 minutes)
- ✅ Helmet security middleware
- ✅ Session-based authentication with PostgreSQL storage
- ✅ Input validation and sanitization

### Production-Ready Features
- ✅ Professional 404 error page with support contact
- ✅ Login page with password reset guidance
- ✅ Complete messaging system with archive/delete functionality
- ✅ Comprehensive admin dashboard
- ✅ Anti-greenwashing compliance tools
- ✅ PDF report generation and export capabilities
- ✅ Real-time collaboration features

### Manual Deployment Steps
1. Set all required environment variables on your hosting platform
2. Ensure PostgreSQL database is accessible 
3. Run `npm run db:push` to set up database schema
4. Deploy application files
5. The application will automatically serve static files in production mode

### Post-Deployment Testing
- [ ] Login functionality works with Replit Auth
- [ ] Database connections are successful
- [ ] API endpoints respond correctly
- [ ] File uploads and image storage function properly
- [ ] PDF report generation works
- [ ] Admin features are accessible

### Troubleshooting
- **CORS errors**: Verify `FRONTEND_URL` environment variable matches your domain
- **Database errors**: Check `DATABASE_URL` format and connectivity
- **Login issues**: Ensure `REPLIT_DOMAINS` is set correctly
- **File upload errors**: Verify storage permissions and configuration

For support: tim@avallen.solutions