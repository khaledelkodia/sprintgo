import { Injectable } from '@nestjs/common';
import type { Address, Zone } from '@prisma/client';
import type { AddressView, CreateAddressDto, UpdateAddressDto } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';

function toAddressView(a: Address & { zone: Zone }): AddressView {
  return {
    id: a.id,
    label: a.label,
    zoneId: a.zoneId,
    zoneName: a.zone.nameAr,
    street: a.street,
    building: a.building,
    floor: a.floor,
    apartment: a.apartment,
    landmark: a.landmark,
    contactPhone: a.contactPhone,
    lat: a.lat == null ? null : Number(a.lat),
    lng: a.lng == null ? null : Number(a.lng),
    isDefault: a.isDefault,
  };
}

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<AddressView[]> {
    const rows = await this.prisma.address.findMany({
      where: { userId, deletedAt: null },
      include: { zone: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toAddressView);
  }

  private async assertZone(zoneId: string): Promise<void> {
    const zone = await this.prisma.zone.findFirst({ where: { id: zoneId, isActive: true } });
    if (!zone) throw new DomainException('VALIDATION_ERROR', 'المنطقة دي مش متاحة');
  }

  async create(userId: string, dto: CreateAddressDto): Promise<AddressView> {
    await this.assertZone(dto.zoneId);
    const count = await this.prisma.address.count({ where: { userId, deletedAt: null } });
    const makeDefault = dto.isDefault || count === 0; // first address is always the default

    const created = await this.prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: {
          userId,
          zoneId: dto.zoneId,
          label: dto.label,
          street: dto.street,
          building: dto.building,
          floor: dto.floor,
          apartment: dto.apartment,
          landmark: dto.landmark,
          contactPhone: dto.contactPhone,
          lat: dto.lat,
          lng: dto.lng,
          isDefault: makeDefault,
        },
        include: { zone: true },
      });
    });
    return toAddressView(created);
  }

  /** Ownership is enforced in the WHERE clause, not an afterthought (docs/architecture/05 §4). */
  private async ownedOrThrow(userId: string, id: string): Promise<Address> {
    const address = await this.prisma.address.findFirst({ where: { id, userId, deletedAt: null } });
    if (!address) throw new DomainException('NOT_FOUND', 'العنوان مش موجود');
    return address;
  }

  async update(userId: string, id: string, dto: UpdateAddressDto): Promise<AddressView> {
    await this.ownedOrThrow(userId, id);
    if (dto.zoneId) await this.assertZone(dto.zoneId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id }, data: dto, include: { zone: true } });
    });
    return toAddressView(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const address = await this.ownedOrThrow(userId, id);
    await this.prisma.address.update({ where: { id }, data: { deletedAt: new Date() } });

    // if we removed the default, promote the newest remaining address
    if (address.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (next) await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
}
