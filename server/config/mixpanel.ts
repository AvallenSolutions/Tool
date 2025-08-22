import Mixpanel from 'mixpanel';

let mixpanel: Mixpanel.Mixpanel | null = null;

export function initializeMixpanel() {
  if (!process.env.MIXPANEL_PROJECT_TOKEN) {
    console.warn('⚠️ MIXPANEL_PROJECT_TOKEN not configured - analytics disabled');
    return null;
  }

  mixpanel = Mixpanel.init(process.env.MIXPANEL_PROJECT_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    host: 'api-eu.mixpanel.com' // EU endpoint for data privacy
  });

  console.log('✅ Mixpanel analytics initialized');
  return mixpanel;
}

export function trackEvent(eventName: string, properties: Record<string, any> = {}, userId?: string) {
  if (!mixpanel) {
    return;
  }

  const eventData = {
    ...properties,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    platform: 'sustainability-platform'
  };

  try {
    if (userId) {
      mixpanel.track(eventName, eventData, { distinct_id: userId }, (error) => {
        if (error) {
          console.warn('Mixpanel tracking error:', error);
        }
      });
    } else {
      mixpanel.track(eventName, eventData, (error) => {
        if (error) {
          console.warn('Mixpanel tracking error:', error);
        }
      });
    }
  } catch (error) {
    console.warn('Mixpanel tracking failed:', error);
  }
}

export function trackUser(userId: string, properties: Record<string, any> = {}) {
  if (!mixpanel) {
    return;
  }

  try {
    mixpanel.people.set(userId, {
      ...properties,
      $last_seen: new Date().toISOString(),
      platform: 'sustainability-platform'
    }, (error) => {
      if (error) {
        console.warn('Mixpanel user tracking error:', error);
      }
    });
  } catch (error) {
    console.warn('Mixpanel user tracking failed:', error);
  }
}

export { mixpanel };