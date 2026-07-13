import webPush from 'web-push';

let configured = false;

export function getWebPushPublicKey() {
  return process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || process.env.WEB_PUSH_PUBLIC_KEY || '';
}

export function isWebPushConfigured() {
  return Boolean(getWebPushPublicKey() && process.env.WEB_PUSH_PRIVATE_KEY);
}

export function getConfiguredWebPush() {
  const publicKey = getWebPushPublicKey();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return null;
  }

  if (!configured) {
    webPush.setVapidDetails(
      process.env.WEB_PUSH_SUBJECT || 'mailto:admin@readalquran.local',
      publicKey,
      privateKey
    );
    configured = true;
  }

  return webPush;
}
