import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { UserResponse } from '../auth/dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Patch(':id/role')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    updateRole(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateRoleDto,
    ): Promise<UserResponse> {
      return this.usersService.updateRole(id, dto.role);
    }
}
