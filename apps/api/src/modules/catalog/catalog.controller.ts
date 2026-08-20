import { Controller, Get, Param, Query } from '@nestjs/common';
import { pageQuerySchema } from '@sprintgo/shared';
import { paged } from '../../common/interceptors/envelope.interceptor';
import { CatalogService } from './catalog.service';

/** Public, cacheable catalog reads (docs/architecture/04 §4.2). No auth. */
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('service-types')
  serviceTypes() {
    return this.catalog.serviceTypes();
  }

  @Get('zones')
  zones(@Query('city') city?: string) {
    return this.catalog.zones(city);
  }

  /** Shops a customer can point an errand at ("هات من ..."). */
  @Get('errand-sources')
  errandSources() {
    return this.catalog.errandSources();
  }

  @Get('stores')
  async stores(
    @Query('serviceType') serviceType?: string,
    @Query('zoneId') zoneId?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = pageQuerySchema.parse({ page, limit });
    const { data, meta } = await this.catalog.stores({ serviceType, zoneId, q, ...pagination });
    return paged(data, meta);
  }

  @Get('stores/:slug')
  storeBySlug(@Param('slug') slug: string, @Query('zoneId') zoneId?: string) {
    return this.catalog.storeBySlug(slug, zoneId);
  }
}
