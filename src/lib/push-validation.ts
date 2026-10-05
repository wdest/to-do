export type PushSubscriptionData = { endpoint: string; keys: { p256dh: string; auth: string } };

export function validPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname;
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash &&
      (host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
       host === 'web.push.apple.com' || host.endsWith('.notify.windows.com'));
  } catch { return false; }
}

export function validSubscription(value: unknown): value is PushSubscriptionData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as PushSubscriptionData;
  return validPushEndpoint(candidate.endpoint) && !!candidate.keys &&
    /^[A-Za-z0-9_-]{87}=$|^[A-Za-z0-9_-]{87}$/.test(candidate.keys.p256dh) &&
    /^[A-Za-z0-9_-]{22}(==)?$/.test(candidate.keys.auth);
}
