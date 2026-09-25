import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { Role } from '../../generated/prisma/enums';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiJwt, ApiNotAMember, ApiUuidParam } from '../common/swagger';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projetos')
@ApiJwt()
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  @ApiOperation({
    summary: 'Criar projeto',
    description:
      'Só PROJECT_MANAGER ou ADMIN. Quem cria vira dono e também ProjectMember. MEMBER recebe 403.',
  })
  @ApiCreatedResponse({ description: 'Projeto criado.' })
  @ApiForbiddenResponse({ description: 'MEMBER não cria projeto.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar projetos visíveis',
    description: 'MEMBER e PROJECT_MANAGER veem só os projetos de que participam. ADMIN vê todos.',
  })
  @ApiOkResponse({ description: 'Lista de projetos, sem passwordHash.' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.list(user);
  }

  @Get('deleted')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Listar projetos apagados',
    description:
      'Só o ADMIN. O apagamento é lógico: a linha fica no banco com deletedAt. MEMBER e PROJECT_MANAGER recebem 403 e não veem esses projetos nas outras rotas.',
  })
  @ApiOkResponse({ description: 'Projetos com deletedAt preenchido.' })
  @ApiForbiddenResponse({ description: 'Quem não é ADMIN.' })
  listDeleted(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listDeleted(user);
  }

  @Get(':id')
  @ApiUuidParam('id', 'Id do projeto.')
  @ApiOperation({
    summary: 'Ver um projeto',
    description:
      'Quem não é membro recebe 403. Projeto inexistente ou apagado recebe 404, exceto o ADMIN, que ainda abre o projeto apagado.',
  })
  @ApiOkResponse({ description: 'Projeto.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiUuidParam('id', 'Id do projeto.')
  @ApiOperation({
    summary: 'Atualizar projeto',
    description:
      'PROJECT_MANAGER membro ou ADMIN. Id inexistente volta 404, inclusive para MEMBER. MEMBER do projeto recebe 403. Body vazio volta 400. Com o projeto ARCHIVED, a única alteração aceita é voltar para ACTIVE. Nome, descrição e qualquer outra ação voltam 409. Projeto apagado também volta 409.',
  })
  @ApiOkResponse({ description: 'Projeto atualizado.' })
  @ApiForbiddenResponse({ description: 'MEMBER do projeto, ou gestor que não participa deste projeto.' })
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiUuidParam('id', 'Id do projeto.')
  @ApiOperation({
    summary: 'Apagar projeto',
    description:
      'Apagamento lógico. Só o dono do projeto ou o ADMIN. Gestor membro que não é o dono recebe 403. O projeto some das listas. Só o ADMIN ainda o vê, em GET /projects/deleted ou GET /projects/:id. Pode apagar mesmo ARCHIVED. A segunda vez, para o ADMIN, volta 409.',
  })
  @ApiOkResponse({ description: 'Projeto com deletedAt preenchido.' })
  @ApiForbiddenResponse({
    description: 'Quem não é o dono nem ADMIN, ou quem não participa deste projeto.',
  })
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  @ApiConflictResponse({ description: 'Projeto já foi apagado.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.projectsService.remove(id, user);
  }
}
