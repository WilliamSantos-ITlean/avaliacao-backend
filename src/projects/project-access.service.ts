import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Project } from '../../generated/prisma/client';
import { ProjectStatus, Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersRepository } from '../users/users.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectsRepository } from './repositories/projects.repository';

export type ProjectAccess = {
  project: Project;
  actor: AuthenticatedUser;
};

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly projectsRepository: ProjectsRepository,
    private readonly membersRepository: ProjectMembersRepository,
  ) {}

  async loadActor(user: AuthenticatedUser): Promise<AuthenticatedUser> {
    const current = await this.usersRepository.findById(user.id);

    if (!current) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return {
      id: current.id,
      email: current.email,
      role: current.role,
    };
  }

  async authorize(projectId: string, user: AuthenticatedUser): Promise<ProjectAccess> {
    const actor = await this.loadActor(user);
    const project = await this.projectsRepository.findById(projectId);

    if (!project || (project.deletedAt && actor.role !== Role.ADMIN)) {
      throw new NotFoundException('Projeto não encontrado');
    }

    if (actor.role === Role.ADMIN) {
      return { project, actor };
    }

    const membership = await this.membersRepository.findByProjectAndUser(
      projectId,
      actor.id,
    );

    if (!membership) {
      throw new ForbiddenException('Você não participa deste projeto');
    }

    return { project, actor };
  }

  assertOpenForChanges(project: Project): void {
    if (project.deletedAt) {
      throw new ConflictException('Projeto apagado não aceita alterações');
    }

    if (project.status === ProjectStatus.ARCHIVED) {
      throw new ConflictException('Projeto arquivado não aceita alterações');
    }
  }
}
