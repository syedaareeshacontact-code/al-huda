import type { AdminUserPushDevice } from '@/lib/auth/users-store';
import type { GuestPushDeviceForAdmin } from '@/lib/push/guest-push-store';

export type AdminNotificationDevice =
  | (GuestPushDeviceForAdmin & { ownerType: 'guest' })
  | AdminUserPushDevice;

interface DeviceDetails {
  browser: string;
  platform: string;
}

export function getNotificationDeviceDetails(userAgent: string | null): DeviceDetails {
  const value = String(userAgent ?? '');
  let browser = 'Unknown browser';
  let platform = 'Unknown platform';

  if (/Edg\//i.test(value)) browser = 'Microsoft Edge';
  else if (/Firefox\//i.test(value)) browser = 'Firefox';
  else if (/CriOS\//i.test(value)) browser = 'Chrome iOS';
  else if (/Chrome\//i.test(value)) browser = 'Chrome';
  else if (/Safari\//i.test(value)) browser = 'Safari';

  if (/Android/i.test(value)) platform = 'Android';
  else if (/iPhone|iPad|iPod/i.test(value)) platform = 'iOS / iPadOS';
  else if (/Windows/i.test(value)) platform = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(value)) platform = 'macOS';
  else if (/Linux/i.test(value)) platform = 'Linux';

  return { browser, platform };
}

function getLogicalDeviceKey(device: AdminNotificationDevice) {
  if (device.ownerType === 'guest') {
    return `guest:${device.deviceId || device.id}`;
  }

  const details = getNotificationDeviceDetails(device.userAgent);
  return `user:${device.userId}:${details.browser}:${details.platform}`;
}

function latestNullableIso(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return left.localeCompare(right) >= 0 ? left : right;
}

export function dedupeAdminNotificationDevices(
  devices: AdminNotificationDevice[]
): AdminNotificationDevice[] {
  const logicalDevices = new Map<string, AdminNotificationDevice>();

  for (const device of devices) {
    const key = getLogicalDeviceKey(device);
    const existing = logicalDevices.get(key);

    if (!existing) {
      logicalDevices.set(key, device);
      continue;
    }

    const latest =
      device.lastSeenAt.localeCompare(existing.lastSeenAt) >= 0 ? device : existing;
    logicalDevices.set(key, {
      ...latest,
      failureCount: Math.max(existing.failureCount, device.failureCount),
      lastSentAt: latestNullableIso(existing.lastSentAt, device.lastSentAt),
    } as AdminNotificationDevice);
  }

  return Array.from(logicalDevices.values()).sort((left, right) =>
    right.lastSeenAt.localeCompare(left.lastSeenAt)
  );
}
