import { Injectable } from '@nestjs/common';
import { RT_EVENTS, rtRooms } from '@sprintgo/shared';
import type { SetWorkingHoursDto, UpdateStoreDto } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { resolveOwnedStore } from './merchant.helpers';

@Injectable()
export class MerchantStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async getStore(ownerId: string) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    return this.prisma.store.findUnique({
      where: { id: store.id },
      include: { workingHours: { orderBy: { dayOfWeek: 'asc' } }, serviceType: true },
    });
  }

  /** Whitelisted updates only — mass assignment is impossible (schema is .strict()). */
  async updateStore(ownerId: string, dto: UpdateStoreDto) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    return this.prisma.store.update({ where: { id: store.id }, data: dto });
  }

  /** The merchant's one-tap "قفل المحل مؤقتًا" switch. */
  async toggleAccepting(ownerId: string, isAcceptingOrders: boolean) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const updated = await this.prisma.store.update({
      where: { id: store.id },
      data: { isAcceptingOrders },
    });
    // sync the toggle across the merchant's other devices
    this.realtime.emit(rtRooms.store(store.id), RT_EVENTS.storeAvailability, { isAcceptingOrders });
    return updated;
  }

  async setWorkingHours(ownerId: string, dto: SetWorkingHoursDto) {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    return this.prisma.$transaction(async (tx) => {
      await tx.workingHour.deleteMany({ where: { storeId: store.id } });
      if (dto.hours.length) {
        await tx.workingHour.createMany({
          data: dto.hours.map((h) => ({ storeId: store.id, ...h })),
        });
      }
      return tx.workingHour.findMany({ where: { storeId: store.id }, orderBy: { dayOfWeek: 'asc' } });
    });
  }
}
