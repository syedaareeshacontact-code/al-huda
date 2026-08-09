import {
  claimInitialUserNotificationsForPush,
  listEnabledPushSubscriptionsForUser,
} from '@/lib/auth/users-store';
import { sendPushNotificationToSubscriptions } from '@/lib/push/send-push-notification';

export async function deliverInitialUserNotifications(userId: string) {
  const notifications = await claimInitialUserNotificationsForPush(userId);
  if (notifications.length === 0) {
    return { sent: 0, skipped: true };
  }

  const subscriptions = await listEnabledPushSubscriptionsForUser(userId);
  if (subscriptions.length === 0) {
    return { sent: 0, skipped: true };
  }

  const deliveries = await Promise.all(
    notifications.map((notification) =>
      sendPushNotificationToSubscriptions(
        subscriptions,
        {
          title: notification.title,
          body: notification.message,
          url: notification.href ?? '/surah',
          tag: `account-onboarding-${notification.id}`,
          renotify: true,
          ttlSeconds: 3_600,
          urgency: notification.priority === 'high' ? 'high' : 'normal',
          data: {
            kind: 'user-notification',
            notificationId: notification.id,
            onboarding: true,
          },
        },
        { deliverySource: 'user-notification' }
      )
    )
  );

  return {
    sent: deliveries.reduce((total, delivery) => total + delivery.sent, 0),
    skipped: false,
  };
}
