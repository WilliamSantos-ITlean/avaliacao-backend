import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserResponse } from '../auth/dto/register.dto';
import { UserResponseDto } from '../auth/dto/auth-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/enums';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiJwt, ApiUuidParam } from '../common/swagger';

@ApiTags('Usuários')
@ApiJwt()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Patch(':id/role')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @ApiUuidParam('id', 'Id do usuário que vai mudar de papel.')
    @ApiOperation({
        summary: 'Promover ou alterar o papel',
        description:
            'Só o ADMIN. Na demo, MEMBER vira PROJECT_MANAGER e passa a poder criar projeto. O alvo inexistente volta 404.',
    })
    @ApiOkResponse({ description: 'Usuário com o papel novo, sem passwordHash.', type: UserResponseDto })
    @ApiForbiddenResponse({ description: 'Quem não é ADMIN.' })
    @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
    updateRole(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateRoleDto,
    ): Promise<UserResponse> {
      return this.usersService.updateRole(id, dto.role);
    }
}
