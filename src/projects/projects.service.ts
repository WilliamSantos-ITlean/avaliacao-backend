import { BadRequestException, Injectable } from '@nestjs/common';
import type { Project } from '../../generated/prisma/client';
import { ProjectStatus, Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UnitOfWork } from '../prisma/unit-of-work';
import { ActivityAction } from './activity-actions';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectAccessService } from './project-access.service';
import { ActivitiesRepository } from './repositories/activities.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import {
  ProjectPatchData,
  ProjectsRepository,
} from './repositories/projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly unitOfWork: UnitOfWork,
    private readonly projectsRepository: ProjectsRepository,
    private readonly membersRepository: ProjectMembersRepository,
    private readonly activitiesRepository: ActivitiesRepository,
  ) {}

  async create(dto: CreateProjectDto, user: AuthenticatedUser) {
    const actor = await this.access.loadActor(user);

    return this.unitOfWork.run(async (tx) => {
      const project = await this.projectsRepository.create(
        {
          name: dto.name,
          description: this.descriptionOrNull(dto.description),
          ownerId: actor.id,
        },
        tx,
      );

      await this.membersRepository.create(
        { projectId: project.id, userId: actor.id },
        tx,
      );

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.PROJECT_CREATED,
          projectId: project.id,
          metadata: { name: project.name },
        },
        tx,
      );

      return project;
    });
  }

  async list(user: AuthenticatedUser) {
    const actor = await this.access.loadActor(user);

    if (actor.role === Role.ADMIN) {
      return this.projectsRepository.findAll();
    }

    return this.projectsRepository.findByMember(actor.id);
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const { project } = await this.access.authorize(id, user);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: AuthenticatedUser) {
    const { project, actor } = await this.access.authorize(id, user);

    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }

    const changes = this.changes(project, dto);

    if (Object.keys(changes).length === 0) {
      return project;
    }

    return this.unitOfWork.run(async (tx) => {
      const updated = await this.projectsRepository.update(project.id, changes, tx);

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: this.actionFor(changes),
          projectId: project.id,
          metadata: changes,
        },
        tx,
      );

      return updated;
    });
  }

  private descriptionOrNull(value?: string): string | null {
    if (!value?.trim()) {
      return null;
    }

    return value.trim();
  }

  private changes(project: Project, dto: UpdateProjectDto): ProjectPatchData {
    const changes: ProjectPatchData = {};

    if (dto.name !== undefined && dto.name !== project.name) {
      changes.name = dto.name;
    }

    if (dto.description !== undefined) {
      const description = dto.description?.trim() ? dto.description.trim() : null;

      if (description !== project.description) {
        changes.description = description;
      }
    }

    if (dto.status !== undefined && dto.status !== project.status) {
      changes.status = dto.status;
    }

    return changes;
  }

  private actionFor(changes: ProjectPatchData): string {
    if (changes.status === ProjectStatus.ARCHIVED) {
      return ActivityAction.PROJECT_ARCHIVED;
    }

    return ActivityAction.PROJECT_UPDATED;
  }
}
