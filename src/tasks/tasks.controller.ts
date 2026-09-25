import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
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
      'Membro do projeto ou ADMIN. Body vazio volta 400 se a tarefa ainda aceita edição. Não muda o estado: isso é PATCH /tasks/:id/status. Projeto ARCHIVED ou apagado volta 409, inclusive para título, descrição, responsável e prazo. Tarefa DONE ou CANCELLED também volta 409. Responsável que não é usuário volta 404. Responsável fora do time ou feriado (dia civil de Brasília) voltam 409. Tarefa apagada some para quem não é ADMIN.',
  })
  @ApiOkResponse({ description: 'Tarefa atualizada.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada, ou responsável que não é um usuário.' })
  @ApiConflictResponse({
    description:
      'Projeto arquivado ou apagado, tarefa concluída ou cancelada, responsável fora do projeto ou prazo em feriado nacional.',
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
      'TODO → IN_PROGRESS ou CANCELLED. IN_PROGRESS → TODO, WAITING_MANAGER_APPROVE ou CANCELLED. De WAITING_MANAGER_APPROVE, só PROJECT_MANAGER ou ADMIN: DONE (aprovar), IN_PROGRESS (devolver) ou CANCELLED. MEMBER nesses três destinos recebe 403. Qualquer outro salto, inclusive ir direto para DONE, volta 409. Projeto ARCHIVED também volta 409. Repetir o status atual responde 200 e não grava Activity.',
  })
  @ApiOkResponse({ description: 'Tarefa no estado novo.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiForbiddenResponse({
    description: 'MEMBER tenta aprovar, devolver ou cancelar uma tarefa em espera.',
  })
  @ApiConflictResponse({ description: 'Transição não permitida, ou projeto arquivado.' })
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.changeStatus(id, dto, user);
  }

  @Delete(':id')
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiOperation({
    summary: 'Apagar tarefa',
    description:
      'Apagamento lógico. Membro do projeto ou ADMIN. A tarefa some da lista. ADMIN ainda abre GET /tasks/:id e, no projeto apagado, vê as tarefas na listagem. Pode apagar mesmo com o projeto ARCHIVED. Projeto apagado volta 409. A segunda vez, para o ADMIN, volta 409.',
  })
  @ApiOkResponse({ description: 'Tarefa com deletedAt preenchido.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiConflictResponse({ description: 'Tarefa já apagada, ou projeto apagado.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.remove(id, user);
  }
}
