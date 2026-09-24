import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tarefas')
@ApiJwt()
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class ProjectTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiUuidParam('projectId', 'Id do projeto.')
  @ApiOperation({
    summary: 'Criar tarefa',
    description:
      'Membro do projeto ou ADMIN. A tarefa nasce TODO. Projeto ARCHIVED ou apagado, responsável que não é membro ou prazo em feriado voltam 409.',
  })
  @ApiCreatedResponse({ description: 'Tarefa criada.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  @ApiConflictResponse({
    description: 'Projeto arquivado, responsável fora do projeto ou prazo em feriado.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, dto, user);
  }

  @Get()
  @ApiUuidParam('projectId', 'Id do projeto.')
  @ApiOperation({
    summary: 'Listar tarefas do projeto',
    description: 'Membro do projeto ou ADMIN.',
  })
  @ApiOkResponse({ description: 'Tarefas do projeto.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.tasksService.list(projectId, user);
  }
}
