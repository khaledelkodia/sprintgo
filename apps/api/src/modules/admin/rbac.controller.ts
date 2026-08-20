import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createRoleSchema, createStaffSchema, updateRoleSchema, updateStaffRolesSchema } from '@sprintgo/shared';
import type { CreateRoleDto, CreateStaffDto, UpdateRoleDto, UpdateStaffRolesDto } from '@sprintgo/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RbacService } from './rbac.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  // ── permission catalog + roles ──
  // Read-only role/catalog listing is available to any staff (low sensitivity,
  // and the team page needs role names to assign them); mutations are gated.

  @Get('permissions')
  permissions() {
    return this.rbac.permissionCatalog();
  }

  @Get('roles')
  listRoles() {
    return this.rbac.listRoles();
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  createRole(@Body(new ZodValidationPipe(createRoleSchema)) dto: CreateRoleDto) {
    return this.rbac.createRole(dto);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.manage')
  updateRole(@Param('id') id: string, @Body(new ZodValidationPipe(updateRoleSchema)) dto: UpdateRoleDto) {
    return this.rbac.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.manage')
  async deleteRole(@Param('id') id: string) {
    await this.rbac.deleteRole(id);
    return { ok: true };
  }

  // ── staff ──

  @Get('staff')
  @RequirePermissions('team.view')
  listStaff() {
    return this.rbac.listStaff();
  }

  @Post('staff')
  @RequirePermissions('team.manage')
  createStaff(@Body(new ZodValidationPipe(createStaffSchema)) dto: CreateStaffDto) {
    return this.rbac.createStaff(dto);
  }

  @Patch('staff/:id/roles')
  @RequirePermissions('team.manage')
  setStaffRoles(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStaffRolesSchema)) dto: UpdateStaffRolesDto,
  ) {
    return this.rbac.setStaffRoles(id, dto.roleIds);
  }

  @Post('staff/:id/suspend')
  @RequirePermissions('team.manage')
  suspendStaff(@CurrentUser() caller: AuthUser, @Param('id') id: string) {
    return this.rbac.setStaffStatus(caller.id, id, 'BLOCKED');
  }

  @Post('staff/:id/activate')
  @RequirePermissions('team.manage')
  activateStaff(@CurrentUser() caller: AuthUser, @Param('id') id: string) {
    return this.rbac.setStaffStatus(caller.id, id, 'ACTIVE');
  }
}
