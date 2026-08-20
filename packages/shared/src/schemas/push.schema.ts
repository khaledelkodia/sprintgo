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
