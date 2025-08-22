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

  if (userId) {
    mixpanel.track(eventName, eventData, { distinct_id: userId });
  } else {
    mixpanel.track(eventName, eventData);
  }
}

export function trackUser(userId: string, properties: Record<string, any> = {}) {
  if (!mixpanel) {
    return;
  }

  mixpanel.people.set(userId, {
    ...properties,
    $last_seen: new Date().toISOString(),
    platform: 'sustainability-platform'
  });
}

export { mixpanel };