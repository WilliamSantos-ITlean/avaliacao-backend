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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Comentários')
@ApiJwt()
@Controller('tasks/:id/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiOperation({
    summary: 'Comentar',
    description:
      'Membro do projeto ou ADMIN. O autor é quem está no token. Projeto ARCHIVED, ou tarefa DONE ou CANCELLED, volta 409.',
  })
  @ApiCreatedResponse({ description: 'Comentário criado.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiConflictResponse({
    description: 'Projeto arquivado, ou tarefa concluída ou cancelada, não aceita novos comentários.',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(id, dto, user);
  }

  @Get()
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiOperation({
    summary: 'Listar comentários',
    description: 'Membro do projeto ou ADMIN.',
  })
  @ApiOkResponse({ description: 'Comentários da tarefa.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commentsService.list(id, user);
  }

  @Delete(':commentId')
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiUuidParam('commentId', 'Id do comentário.')
  @ApiOperation({
    summary: 'Apagar comentário',
    description:
      'Só o autor ou o ADMIN. Outro membro, inclusive PROJECT_MANAGER, recebe 403. Comentário de outra tarefa ou inexistente volta 404. Projeto ARCHIVED, ou tarefa DONE ou CANCELLED, volta 409.',
  })
  @ApiOkResponse({ description: 'Comentário apagado.' })
  @ApiNotAMember()
  @ApiForbiddenResponse({ description: 'Quem não é o autor nem ADMIN.' })
  @ApiNotFoundResponse({ description: 'Tarefa ou comentário não encontrado.' })
  @ApiConflictResponse({
    description: 'Projeto arquivado, ou tarefa concluída ou cancelada, não aceita apagar comentário.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.commentsService.remove(id, commentId, user);
  }
}
