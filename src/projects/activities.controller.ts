import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { ApiJwt, ApiNotAMember, ApiUuidParam } from '../common/swagger';
import { ActivitiesService } from './activities.service';

@ApiTags('Atividades')
@ApiJwt()
@Controller('projects/:projectId/activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiUuidParam('projectId', 'Id do projeto.')
  @ApiOperation({
    summary: 'Histórico do projeto',
    description:
      'Ações de domínio (membro entrou, tarefa mudou de estado, comentário, anexo). Não é log de HTTP. Membro do projeto ou ADMIN.',
  })
  @ApiOkResponse({ description: 'Atividades, da mais recente para a mais antiga.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Projeto não encontrado.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.activitiesService.listByProject(projectId, user);
  }
}
