import { Injectable } from '@nestjs/common';
import type { ErrandSourceView, PageMeta, StoreCardView, StoreDetailView } from '@sprintgo/shared';
import { DomainException } from '../../common/errors/domain.exception';
import { CatalogRepository } from './catalog.repository';
import {
  toErrandSourceView,
  toServiceTypeView,
  toStoreCardView,
  toStoreDetailView,
  toZoneView,
} from './catalog.mapper';

interface StoreQuery {
  serviceType?: string;
  zoneId?: string;
  q?: string;
  page: number;
  limit: number;
}

@Injectable()
export class CatalogService {
  constructor(private readonly repo: CatalogRepository) {}

  async serviceTypes() {
    return (await this.repo.serviceTypes()).map(toServiceTypeView);
  }

  async zones(city?: string) {
    return (await this.repo.zones(city)).map(toZoneView);
  }

  async errandSources(): Promise<ErrandSourceView[]> {
    return (await this.repo.errandSources()).map(toErrandSourceView);
  }

  async stores(query: StoreQuery): Promise<{ data: StoreCardView[]; meta: PageMeta }> {
    const { rows, total } = await this.repo.stores({
      serviceTypeSlug: query.serviceType,
      zoneId: query.zoneId,
      q: query.q,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: rows.map(toStoreCardView),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        hasNext: query.page * query.limit < total,
      },
    };
  }

  async storeBySlug(slug: string, zoneId?: string): Promise<StoreDetailView> {
    const store = await this.repo.storeBySlug(slug, zoneId);
    if (!store) throw new DomainException('NOT_FOUND', 'المحل ده مش موجود');
    return toStoreDetailView(store);
  }
}
