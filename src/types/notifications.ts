export type NotificationType =
  | 'prayer'
  | 'quran'
  | 'bookmark'
  | 'audio'
  | 'system'
  | 'islamic';

export type NotificationPriority = 'low' | 'normal' | 'high';

export interface UserNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  href?: string | null;
  createdAt: string;
  readAt?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}
