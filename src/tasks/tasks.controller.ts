import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
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
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tarefas')
@ApiJwt()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(':id')
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiOperation({
    summary: 'Ver uma tarefa',
    description: 'Membro do projeto da tarefa, ou ADMIN. Tarefa inexistente volta 404.',
  })
  @ApiOkResponse({ description: 'Tarefa.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiOperation({
    summary: 'Editar tarefa',
    description:
      'Membro do projeto ou ADMIN. Body vazio volta 400. Não muda o estado: isso é PATCH /tasks/:id/status. Projeto arquivado, responsável fora do time ou feriado voltam 409.',
  })
  @ApiOkResponse({ description: 'Tarefa atualizada.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiConflictResponse({
    description: 'Projeto arquivado, responsável fora do projeto ou prazo em feriado.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiOperation({
    summary: 'Mudar o estado',
    description:
      'TODO → IN_PROGRESS ou CANCELLED. IN_PROGRESS → TODO, WAITING_MANAGER_APPROVE ou CANCELLED. De WAITING_MANAGER_APPROVE, só PROJECT_MANAGER ou ADMIN: DONE (aprovar), IN_PROGRESS (devolver) ou CANCELLED. Ir direto para DONE, ou MEMBER aprovar, volta 409. Projeto ARCHIVED também volta 409.',
  })
  @ApiOkResponse({ description: 'Tarefa no estado novo.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiConflictResponse({ description: 'Transição não permitida, ou projeto arquivado.' })
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.changeStatus(id, dto, user);
  }
}
