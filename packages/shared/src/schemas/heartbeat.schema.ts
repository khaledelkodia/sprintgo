import { z } from 'zod';

/** Courier location heartbeat while available (for nearest-courier dispatch). */
export const courierHeartbeatSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();
export type CourierHeartbeatDto = z.infer<typeof courierHeartbeatSchema>;
