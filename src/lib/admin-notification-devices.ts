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

export function reconcileNotificationDeviceOwnership(
  guestDevices: GuestPushDeviceForAdmin[],
  userDevices: AdminUserPushDevice[]
): AdminNotificationDevice[] {
  const dedupedUsers = dedupeAdminNotificationDevices(userDevices).filter(
    (device): device is AdminUserPushDevice => device.ownerType === 'user'
  );
  const dedupedGuests = dedupeAdminNotificationDevices(
    guestDevices.map((device) => ({ ...device, ownerType: 'guest' as const }))
  ).filter(
    (
      device
    ): device is GuestPushDeviceForAdmin & { ownerType: 'guest' } =>
      device.ownerType === 'guest'
  );
  const guestByDeviceId = new Map(
    dedupedGuests
      .filter(
        (device) =>
          !device.enabled &&
          device.disabledReason === 'signed-in-owner-migration'
      )
      .map((device) => [device.deviceId, device])
  );
  const mergedUsers = dedupedUsers.map((userDevice) => {
    const guestDevice = userDevice.deviceId
      ? guestByDeviceId.get(userDevice.deviceId)
      : undefined;
    if (!guestDevice) {
      return userDevice;
    }

    const userNotificationAt = latestNullableIso(
      userDevice.lastNotificationVisitAt,
      latestNullableIso(
        userDevice.lastNotificationDisplayedAt,
        userDevice.lastSentAt
      )
    );
    const guestNotificationAt = latestNullableIso(
      guestDevice.lastNotificationVisitAt,
      latestNullableIso(
        guestDevice.lastNotificationDisplayedAt,
        guestDevice.lastSentAt
      )
    );
    const latestNotification =
      String(guestNotificationAt ?? '').localeCompare(
        String(userNotificationAt ?? '')
      ) > 0
        ? guestDevice
        : userDevice;
    const guestHasLatestEngagement =
      String(guestDevice.lastEngagementAt ?? '').localeCompare(
        String(userDevice.lastEngagementAt ?? '')
      ) > 0;

    return {
      ...userDevice,
      lastSentAt: latestNullableIso(
        userDevice.lastSentAt,
        guestDevice.lastSentAt
      ),
      lastEngagementAt: latestNullableIso(
        userDevice.lastEngagementAt,
        guestDevice.lastEngagementAt
      ),
      lastEngagementKind: guestHasLatestEngagement
        ? guestDevice.lastEngagementKind
        : userDevice.lastEngagementKind,
      notificationSentCount:
        userDevice.notificationSentCount + guestDevice.notificationSentCount,
      notificationTrackedSentCount:
        userDevice.notificationTrackedSentCount +
        guestDevice.notificationTrackedSentCount,
      notificationDisplayedCount:
        userDevice.notificationDisplayedCount +
        guestDevice.notificationDisplayedCount,
      notificationVisitCount:
        userDevice.notificationVisitCount + guestDevice.notificationVisitCount,
      notificationTrackedVisitCount:
        userDevice.notificationTrackedVisitCount +
        guestDevice.notificationTrackedVisitCount,
      siteVisitCount: Math.max(
        userDevice.siteVisitCount,
        guestDevice.siteVisitCount
      ),
      lastSiteVisitAt: latestNullableIso(
        userDevice.lastSiteVisitAt,
        guestDevice.lastSiteVisitAt
      ),
      lastNotificationVisitAt: latestNullableIso(
        userDevice.lastNotificationVisitAt,
        guestDevice.lastNotificationVisitAt
      ),
      lastNotificationDisplayedAt: latestNullableIso(
        userDevice.lastNotificationDisplayedAt,
        guestDevice.lastNotificationDisplayedAt
      ),
      lastNotificationCampaignId:
        latestNotification.lastNotificationCampaignId,
      lastNotificationKind: latestNotification.lastNotificationKind,
    };
  });

  return [
    ...mergedUsers,
    ...dedupedGuests.filter(
      (device) => guestByDeviceId.get(device.deviceId)?.id !== device.id
    ),
  ].sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
}

function getLogicalDeviceKey(device: AdminNotificationDevice) {
  if (device.ownerType === 'guest') {
    return `guest:${device.deviceId || device.id}`;
  }

  if (device.deviceId) {
    return `user:${device.userId}:${device.deviceId}`;
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
    const latestEngagement =
      String(device.lastEngagementAt ?? '').localeCompare(
        String(existing.lastEngagementAt ?? '')
      ) >= 0
        ? device
        : existing;
    logicalDevices.set(key, {
      ...latest,
      enabled: latest.enabled,
      failureCount: latest.failureCount,
      lastSentAt: latestNullableIso(existing.lastSentAt, device.lastSentAt),
      lastEngagementAt: latestNullableIso(
        existing.lastEngagementAt,
        device.lastEngagementAt
      ),
      lastEngagementKind: latestEngagement.lastEngagementKind,
      notificationSentCount:
        existing.notificationSentCount + device.notificationSentCount,
      notificationTrackedSentCount:
        (Number(existing.notificationTrackedSentCount) || 0) +
        (Number(device.notificationTrackedSentCount) || 0),
      notificationDisplayedCount:
        (Number(existing.notificationDisplayedCount) || 0) +
        (Number(device.notificationDisplayedCount) || 0),
      notificationVisitCount:
        existing.notificationVisitCount + device.notificationVisitCount,
      notificationTrackedVisitCount:
        (Number(existing.notificationTrackedVisitCount) || 0) +
        (Number(device.notificationTrackedVisitCount) || 0),
      siteVisitCount:
        latest.ownerType === 'guest'
          ? Math.max(existing.siteVisitCount, device.siteVisitCount)
          : existing.siteVisitCount + device.siteVisitCount,
      lastSiteVisitAt: latestNullableIso(
        existing.lastSiteVisitAt,
        device.lastSiteVisitAt
      ),
      lastNotificationVisitAt: latestNullableIso(
        existing.lastNotificationVisitAt,
        device.lastNotificationVisitAt
      ),
      lastNotificationDisplayedAt: latestNullableIso(
        existing.lastNotificationDisplayedAt,
        device.lastNotificationDisplayedAt
      ),
      lastNotificationCampaignId: latestVisit.lastNotificationCampaignId,
      lastNotificationKind: latestVisit.lastNotificationKind,
    } as AdminNotificationDevice);
  }

  return Array.from(logicalDevices.values()).sort((left, right) =>
    right.lastSeenAt.localeCompare(left.lastSeenAt)
  );
}
