import type { AdminUserPushDevice } from '@/lib/auth/users-store';
import type { GuestPushDeviceForAdmin } from '@/lib/push/guest-push-store';
import {
  getPushDeviceDetails,
  type PushDeviceDetails,
} from './push/device-details';

export type AdminNotificationDevice =
  | (GuestPushDeviceForAdmin & { ownerType: 'guest' })
  | AdminUserPushDevice;

export const getNotificationDeviceDetails: (
  userAgent: string | null
) => PushDeviceDetails = getPushDeviceDetails;

function getLogicalDeviceKey(device: AdminNotificationDevice) {
  if (device.ownerType === 'guest') {
    return `guest:${device.deviceId || device.id}`;
  }

  const details = getPushDeviceDetails(device.userAgent);
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
    const latestVisit =
      String(device.lastNotificationVisitAt ?? '').localeCompare(
        String(existing.lastNotificationVisitAt ?? '')
      ) >= 0
        ? device
        : existing;
    logicalDevices.set(key, {
      ...latest,
      failureCount: Math.max(existing.failureCount, device.failureCount),
      lastSentAt: latestNullableIso(existing.lastSentAt, device.lastSentAt),
      lastEngagementAt: latestNullableIso(
        existing.lastEngagementAt,
        device.lastEngagementAt
      ),
      notificationSentCount:
        existing.notificationSentCount + device.notificationSentCount,
      notificationVisitCount:
        existing.notificationVisitCount + device.notificationVisitCount,
      siteVisitCount: existing.siteVisitCount + device.siteVisitCount,
      lastSiteVisitAt: latestNullableIso(
        existing.lastSiteVisitAt,
        device.lastSiteVisitAt
      ),
      lastNotificationVisitAt: latestNullableIso(
        existing.lastNotificationVisitAt,
        device.lastNotificationVisitAt
      ),
      lastNotificationCampaignId: latestVisit.lastNotificationCampaignId,
      lastNotificationKind: latestVisit.lastNotificationKind,
    } as AdminNotificationDevice);
  }

  return Array.from(logicalDevices.values()).sort((left, right) =>
    right.lastSeenAt.localeCompare(left.lastSeenAt)
  );
}
