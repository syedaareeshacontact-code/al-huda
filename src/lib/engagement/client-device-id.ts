const SITE_DEVICE_ID_KEY = 'alhuda:site-device-id';
const LEGACY_PUSH_DEVICE_ID_KEY = 'alhuda:guest-push-device-id';

function createDeviceId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const value = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getSiteDeviceId() {
  const existing =
    window.localStorage.getItem(SITE_DEVICE_ID_KEY) ??
    window.localStorage.getItem(LEGACY_PUSH_DEVICE_ID_KEY);
  if (existing) {
    window.localStorage.setItem(SITE_DEVICE_ID_KEY, existing);
    return existing;
  }

  const deviceId = createDeviceId();
  window.localStorage.setItem(SITE_DEVICE_ID_KEY, deviceId);
  return deviceId;
}
