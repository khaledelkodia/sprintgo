import { z } from 'zod';

/** The browser PushSubscription JSON (from pushManager.subscribe). */
export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  })
  .strict();
export type PushSubscriptionDto = z.infer<typeof pushSubscriptionSchema>;

export const subscribePushSchema = z.object({ subscription: pushSubscriptionSchema }).strict();
export type SubscribePushDto = z.infer<typeof subscribePushSchema>;

export const unsubscribePushSchema = z.object({ endpoint: z.string().url() }).strict();
export type UnsubscribePushDto = z.infer<typeof unsubscribePushSchema>;

/** Where a device token came from — decides which transport delivers to it. */
export const DEVICE_PLATFORMS = ['WEB', 'IOS', 'ANDROID'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

/** A phone registering its FCM token so push can reach it while the app is closed. */
export const registerDeviceSchema = z
  .object({
    token: z.string().min(10).max(4096),
    platform: z.enum(DEVICE_PLATFORMS).default('ANDROID'),
  })
  .strict();
export type RegisterDeviceDto = z.infer<typeof registerDeviceSchema>;

export const unregisterDeviceSchema = z.object({ token: z.string().min(10).max(4096) }).strict();
export type UnregisterDeviceDto = z.infer<typeof unregisterDeviceSchema>;
