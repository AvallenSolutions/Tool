# CAPTCHA Security Setup Guide

## Overview
CAPTCHA security has been added to the login process to prevent automated attacks and ensure human verification before authentication.

## Implementation Details

### Frontend Changes
- Added Google reCAPTCHA component to login page
- Users must complete CAPTCHA before login button becomes active
- Added loading states and error handling
- CAPTCHA resets on verification failure

### Backend Changes
- Added CAPTCHA verification endpoint: `/api/verify-captcha`
- Added session-based CAPTCHA verification storage
- Enhanced login route to check CAPTCHA verification
- Added rate limiting to prevent abuse (10 attempts per 15 minutes per IP)
- CAPTCHA verification expires after 5 minutes

## Environment Variables Required

### Production Setup
Add these environment variables for production use:

```bash
# Google reCAPTCHA keys (get from https://www.google.com/recaptcha/admin)
VITE_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

### Development/Testing
For development, the implementation uses Google's test keys:
- Site Key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Secret Key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

## Security Features

### Rate Limiting
- **CAPTCHA Verification**: 10 attempts per IP per 15 minutes
- **Session Management**: CAPTCHA verification stored in session
- **Expiration**: CAPTCHA verification expires after 5 minutes

### Verification Flow
1. User loads login page
2. User completes CAPTCHA verification
3. Frontend sends CAPTCHA token to `/api/verify-captcha`
4. Backend verifies token with Google reCAPTCHA API
5. On success, verification is stored in session
6. User clicks login button, redirected to `/api/login`
7. Login route checks for valid CAPTCHA verification
8. If verified, proceed with OAuth flow
9. If not verified, redirect back to login with error

### Protection Against
- **Bot Attacks**: Automated login attempts blocked
- **Brute Force**: Rate limiting prevents rapid attempts
- **Session Hijacking**: CAPTCHA verification tied to session
- **Replay Attacks**: Single-use verification with expiration

## User Experience
- Clean integration with existing login design
- Clear error messages for failed verification
- Button remains disabled until CAPTCHA completed
- Loading states during verification process

## Testing
- Use Google's test keys for development
- Test rate limiting with multiple attempts
- Verify session expiration after 5 minutes
- Test error handling for failed verifications

## Production Deployment
1. Register domain with Google reCAPTCHA
2. Get production site key and secret key
3. Set environment variables in production
4. Test with real CAPTCHA challenges
5. Monitor for any verification issues

Date: August 22, 2025
Status: IMPLEMENTED - CAPTCHA SECURITY ACTIVE