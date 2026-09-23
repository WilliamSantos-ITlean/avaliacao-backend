import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { ApiJwt, ApiNotAMember, ApiUuidParam } from '../common/swagger';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectMembersService } from './project-members.service';

@ApiTags('Membros')
@ApiJwt()
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
  constructor(private readonly membersService: ProjectMembersService) {}

  @Post()
  @ApiUuidParam('projectId', 'Id do projeto.')
  @ApiOperation({
    summary: 'Adicionar membro pelo e-mail',
    description:
      'PROJECT_MANAGER membro ou ADMIN. O e-mail precisa ser de uma conta já existente. O vínculo gravado é o userId dessa conta.',
  })
  @ApiCreatedResponse({ description: 'Membro criado, sem passwordHash.' })
  @ApiForbiddenResponse({ description: 'MEMBER não gerencia membros, ou quem chama não participa do projeto.' })
  @ApiNotFoundResponse({ description: 'Projeto inexistente ou e-mail sem conta.' })
  @ApiConflictResponse({ description: 'Essa pessoa já é membro deste projeto.' })
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.membersService.add(projectId, dto, user);
  }

  @Get()
  @ApiUuidParam('projectId', 'Id do projeto.')
  @ApiOperation({
    summary: 'Listar membros',
    description: 'Membro do projeto ou ADMIN. A lista traz e-mail e papel, nunca passwordHash.',
  })
  @ApiOkResponse({ description: 'Membros do projeto.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.membersService.list(projectId, user);
  }

  @Delete(':userId')
  @ApiUuidParam('projectId', 'Id do projeto.')
  @ApiUuidParam('userId', 'Id do usuário a remover. Não é o id da linha ProjectMember.')
  @ApiOperation({
    summary: 'Remover membro',
    description: 'PROJECT_MANAGER membro ou ADMIN. O dono do projeto não pode ser removido.',
  })
  @ApiOkResponse({ description: 'Vínculo removido.' })
  @ApiForbiddenResponse({ description: 'MEMBER não gerencia membros, ou quem chama não participa do projeto.' })
  @ApiNotFoundResponse({ description: 'Projeto inexistente ou essa pessoa não é membro.' })
  @ApiConflictResponse({ description: 'O dono do projeto precisa continuar membro.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membersService.remove(projectId, userId, user);
  }
}
