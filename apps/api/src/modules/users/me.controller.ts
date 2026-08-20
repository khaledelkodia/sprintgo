import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { updateMeSchema } from '@sprintgo/shared';
import type { PublicUser, UpdateMeDto } from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DomainException } from '../../common/errors/domain.exception';
import { toPublicUser, UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async me(@CurrentUser() auth: AuthUser): Promise<PublicUser> {
    const user = await this.users.findById(auth.id);
    if (!user) throw new DomainException('AUTH_REQUIRED', 'سجل دخولك الأول');
    if (user.status !== 'ACTIVE') {
      throw new DomainException('FORBIDDEN', 'الحساب موقوف — كلم خدمة العملاء');
    }
    // Echo the token's permissions so the dashboard UI and the guards agree.
    return toPublicUser(user, auth.perms);
  }

  @Patch()
  async update(
    @CurrentUser() auth: AuthUser,
    @Body(new ZodValidationPipe(updateMeSchema)) dto: UpdateMeDto,
  ): Promise<PublicUser> {
    return toPublicUser(await this.users.updateMe(auth.id, dto), auth.perms);
  }
}
