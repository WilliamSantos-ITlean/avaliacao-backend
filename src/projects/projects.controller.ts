import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
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

  @Get(':id')
  @ApiUuidParam('id', 'Id do projeto.')
  @ApiOperation({
    summary: 'Ver um projeto',
    description: 'Quem não é membro recebe 403. Projeto inexistente recebe 404. ADMIN entra em qualquer um.',
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
  @UseGuards(RolesGuard)
  @Roles(Role.PROJECT_MANAGER, Role.ADMIN)
  @ApiUuidParam('id', 'Id do projeto.')
  @ApiOperation({
    summary: 'Atualizar projeto',
    description:
      'PROJECT_MANAGER membro ou ADMIN. Body vazio volta 400. Arquivar (ARCHIVED) passa a rejeitar tarefa, comentário e anexo.',
  })
  @ApiOkResponse({ description: 'Projeto atualizado.' })
  @ApiForbiddenResponse({ description: 'MEMBER, ou gestor que não participa deste projeto.' })
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto, user);
  }
}
