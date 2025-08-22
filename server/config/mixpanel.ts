import Mixpanel from 'mixpanel';

let mixpanel: Mixpanel.Mixpanel | null = null;

export function initializeMixpanel() {
  if (!process.env.MIXPANEL_PROJECT_TOKEN) {
    console.warn('⚠️ MIXPANEL_PROJECT_TOKEN not configured - analytics disabled');
    return null;
  }

  try {
    mixpanel = Mixpanel.init(process.env.MIXPANEL_PROJECT_TOKEN, {
      debug: process.env.NODE_ENV === 'development',
      host: 'api-eu.mixpanel.com' // EU endpoint for data privacy
    });
    console.log('✅ Mixpanel analytics initialized');
    return mixpanel;
  } catch (error) {
    console.warn('⚠️ Mixpanel initialization failed, disabling analytics:', error);
    mixpanel = null;
    return null;
  }
}

export function trackEvent(eventName: string, properties: Record<string, any> = {}, userId?: string) {
  if (!mixpanel) {
    return;
  }

  const eventData: Record<string, any> = {
    ...properties,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    platform: 'sustainability-platform'
  };

  try {
    if (userId) {
      eventData.distinct_id = userId;
    }
    mixpanel.track(eventName, eventData);
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
    });
  } catch (error) {
    console.warn('Mixpanel user tracking failed:', error);
  }
}

export { mixpanel };