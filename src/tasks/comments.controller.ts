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
    description: 'Membro do projeto ou ADMIN. O autor é quem está no token. Projeto ARCHIVED volta 409.',
  })
  @ApiCreatedResponse({ description: 'Comentário criado.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiConflictResponse({ description: 'Projeto arquivado não aceita novos comentários.' })
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
}
