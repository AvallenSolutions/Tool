import * as Sentry from "@sentry/node";

export function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️ SENTRY_DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    beforeSend(event) {
      // Filter out common development noise
      if (process.env.NODE_ENV === 'development') {
        // Skip certain error types that are common in development
        if (event.exception?.values?.[0]?.type === 'ENOENT') {
          return null;
        }
      }
      return event;
    },

    // Tag all events with platform context
    initialScope: {
      tags: {
        platform: 'sustainability-platform',
        component: 'backend'
      }
    }
  });

  console.log('✅ Sentry error tracking initialized');
}

export { Sentry };