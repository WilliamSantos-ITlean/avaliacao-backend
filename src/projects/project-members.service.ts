import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { isPrismaError } from '../common/is-prisma-error';
import { UnitOfWork } from '../prisma/unit-of-work';
import { UsersRepository } from '../users/users.repository';
import { ActivityAction } from './activity-actions';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectAccessService } from './project-access.service';
import { ActivitiesRepository } from './repositories/activities.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly unitOfWork: UnitOfWork,
    private readonly usersRepository: UsersRepository,
    private readonly membersRepository: ProjectMembersRepository,
    private readonly activitiesRepository: ActivitiesRepository,
  ) { }

  async list(projectId: string, user: AuthenticatedUser) {
    await this.access.authorize(projectId, user);
    return this.membersRepository.listByProject(projectId);
  }

  async add(projectId: string, dto: AddProjectMemberDto, user: AuthenticatedUser) {
    const { project, actor } = await this.access.authorize(projectId, user);
    this.access.assertOpenForChanges(project);
    this.assertCanManageMembers(actor);

    const email = dto.email.trim().toLowerCase()
    const target = await this.usersRepository.findByEmail(email);

    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const existing = await this.membersRepository.findByProjectAndUser(
      projectId,
      target.id,
    );

    if (existing) {
      throw new ConflictException('Usuário já é membro deste projeto');
    }

    try {
      return await this.unitOfWork.run(async (tx) => {
        const member = await this.membersRepository.create(
          { projectId, userId: target.id },
          tx,
        );

        await this.activitiesRepository.record(
          {
            actorId: actor.id,
            action: ActivityAction.MEMBER_ADDED,
            projectId,
            metadata: { userId: target.id, email: target.email },
          },
          tx,
        );

        return member;
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Usuário já é membro deste projeto');
      }

      throw error;
    }
  }

  async remove(projectId: string, memberUserId: string, user: AuthenticatedUser) {
    const { project, actor } = await this.access.authorize(projectId, user);
    this.access.assertOpenForChanges(project);
    this.assertCanManageMembers(actor);

    const membership = await this.membersRepository.findByProjectAndUser(
      projectId,
      memberUserId,
    );

    if (!membership) {
      throw new NotFoundException('Membro não encontrado neste projeto');
    }

    if (project.ownerId === memberUserId) {
      throw new ConflictException('O dono do projeto precisa continuar membro');
    }

    try {
      return await this.unitOfWork.run(async (tx) => {
        const removed = await this.membersRepository.delete(
          projectId,
          memberUserId,
          tx,
        );

        await this.activitiesRepository.record(
          {
            actorId: actor.id,
            action: ActivityAction.MEMBER_REMOVED,
            projectId,
            metadata: { userId: memberUserId },
          },
          tx,
        );

        return removed;
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Membro não encontrado neste projeto');
      }

      throw error;
    }
  }

  private assertCanManageMembers(actor: AuthenticatedUser) {
    if (actor.role === Role.PROJECT_MANAGER || actor.role === Role.ADMIN) {
      return;
    }

    throw new ForbiddenException('Sem permissão para gerenciar membros');
  }
}
