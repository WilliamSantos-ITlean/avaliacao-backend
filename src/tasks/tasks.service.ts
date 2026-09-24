import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Role, TaskStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UnitOfWork } from '../prisma/unit-of-work';
import { ActivityAction } from '../projects/activity-actions';
import { ProjectAccessService } from '../projects/project-access.service';
import { ActivitiesRepository } from '../projects/repositories/activities.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  TaskPatchData,
  TasksRepository,
  TaskView,
} from './repositories/tasks.repository';
import { ProjectMembersRepository } from '../projects/repositories/project-members.repository';
import { HolidaysService } from '../holidays/holidays.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly holidays: HolidaysService,
    private readonly unitOfWork: UnitOfWork,
    private readonly membersRepository: ProjectMembersRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly activitiesRepository: ActivitiesRepository,
  ) { }

  async create(projectId: string, dto: CreateTaskDto, user: AuthenticatedUser) {
    const { project, actor } = await this.access.authorize(projectId, user);
    const dueDate = this.toDate(dto.dueDate);

    this.access.assertOpenForChanges(project);
    await this.assertAssigneeIsMember(project.id, dto.assigneeId);
    await this.assertDueDate(dueDate);

    return this.unitOfWork.run(async (tx) => {
      const task = await this.tasksRepository.create(
        {
          projectId: project.id,
          title: dto.title,
          description: this.descriptionOrNull(dto.description),
          assigneeId: dto.assigneeId ?? null,
          dueDate,
        },
        tx,
      );

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.TASK_CREATED,
          projectId: project.id,
          taskId: task.id,
          metadata: {
            title: task.title,
            assigneeId: task.assigneeId,
            dueDate: task.dueDate?.toISOString() ?? null,
          },
        },
        tx,
      );

      return task;
    });
  }

  async list(projectId: string, user: AuthenticatedUser) {
    const { project, actor } = await this.access.authorize(projectId, user);
    const includeDeleted = actor.role === Role.ADMIN && project.deletedAt !== null;
    return this.tasksRepository.listByProject(projectId, includeDeleted);
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const task = await this.requireTask(id);
    const { actor } = await this.access.authorize(task.projectId, user);
    this.hideDeletedTask(task, actor);
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: AuthenticatedUser) {
    const task = await this.requireTask(id);
    const { project, actor } = await this.access.authorize(task.projectId, user);
    this.rejectDeletedTask(task, actor);
    this.access.assertOpenForChanges(project);

    if (
      dto.title === undefined &&
      dto.description === undefined &&
      dto.assigneeId === undefined &&
      dto.dueDate === undefined
    ) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }

    const changes = this.changes(task, dto);

    if (Object.keys(changes).length === 0) {
      return task;
    }

    if (changes.assigneeId !== undefined) {
      await this.assertAssigneeIsMember(task.projectId, changes.assigneeId);
    }

    if (changes.dueDate) {
      await this.assertDueDate(changes.dueDate);
    }

    return this.unitOfWork.run(async (tx) => {
      const updated = await this.tasksRepository.update(task.id, changes, tx);

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.TASK_UPDATED,
          projectId: task.projectId,
          taskId: task.id,
          metadata: this.activityMetadata(changes),
        },
        tx,
      );

      return updated;
    });
  }

  async changeStatus(
    id: string,
    dto: UpdateTaskStatusDto,
    user: AuthenticatedUser,
  ) {
    const task = await this.requireTask(id);
    const { project, actor } = await this.access.authorize(
      task.projectId,
      user,
    );

    this.rejectDeletedTask(task, actor);
    this.access.assertOpenForChanges(project);

    if (dto.status === task.status) {
      return task;
    }

    const next = this.resolveNextStatus(task, dto.status, actor);

    return this.unitOfWork.run(async (tx) => {
      const updated = await this.tasksRepository.update(
        task.id,
        { status: next },
        tx,
      );

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.TASK_STATUS_CHANGED,
          projectId: task.projectId,
          taskId: task.id,
          metadata: { from: task.status, to: next },
        },
        tx,
      );

      return updated;
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const task = await this.requireTask(id);
    const { project, actor } = await this.access.authorize(task.projectId, user);

    if (task.deletedAt) {
      this.hideDeletedTask(task, actor);
      throw new ConflictException('Tarefa já foi apagada');
    }

    if (project.deletedAt) {
      throw new ConflictException('Projeto apagado não aceita alterações');
    }

    return this.unitOfWork.run(async (tx) => {
      const removed = await this.tasksRepository.softDelete(task.id, tx);

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.TASK_DELETED,
          projectId: task.projectId,
          taskId: task.id,
          metadata: { title: task.title },
        },
        tx,
      );

      return removed;
    });
  }

  private hideDeletedTask(task: TaskView, actor: AuthenticatedUser): void {
    if (task.deletedAt && actor.role !== Role.ADMIN) {
      throw new NotFoundException('Tarefa não encontrada');
    }
  }

  private rejectDeletedTask(task: TaskView, actor: AuthenticatedUser): void {
    this.hideDeletedTask(task, actor);

    if (task.deletedAt) {
      throw new ConflictException('Tarefa apagada não aceita alterações');
    }
  }

  private async requireTask(id: string): Promise<TaskView> {
    const task = await this.tasksRepository.findById(id);

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return task;
  }

  private descriptionOrNull(value?: string): string | null {
    if (!value?.trim()) {
      return null;
    }

    return value.trim();
  }

  private toDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    return new Date(value);
  }

  private changes(task: TaskView, dto: UpdateTaskDto): TaskPatchData {
    const changes: TaskPatchData = {};

    if (dto.title !== undefined && dto.title !== task.title) {
      changes.title = dto.title;
    }

    if (dto.description !== undefined) {
      const description = dto.description?.trim()
        ? dto.description.trim()
        : null;

      if (description !== task.description) {
        changes.description = description;
      }
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
      changes.assigneeId = dto.assigneeId;
    }

    if (dto.dueDate !== undefined) {
      const dueDate = this.toDate(dto.dueDate);
      const current = task.dueDate?.getTime() ?? null;
      const next = dueDate?.getTime() ?? null;

      if (current !== next) {
        changes.dueDate = dueDate;
      }
    }

    return changes;
  }

  private activityMetadata(changes: TaskPatchData): Prisma.InputJsonValue {
    return {
      ...changes,
      ...(changes.dueDate instanceof Date
        ? { dueDate: changes.dueDate.toISOString() }
        : {}),
    };
  }

  private async assertAssigneeIsMember(
    projectId: string,
    assigneeId: string | null | undefined,
  ): Promise<void> {
    if (!assigneeId) {
      return;
    }
    const membership = await this.membersRepository.findByProjectAndUser(
      projectId,
      assigneeId,
    );

    if (!membership) {
      throw new ConflictException('O responsável da tarefa precisa ser membro do projeto')
    }
  }

  private async assertDueDate(dueDate: Date | null): Promise<void> {
    if (!dueDate) {
      return;
    }

    const { year, day: dueDay } = this.civilDayInBrasilia(dueDate);

    const holidays = await this.holidays.listByYear(year);
    const found = holidays.find((holiday) => holiday.date === dueDay);

    if (found) {
      throw new ConflictException('O prazo cai em um feriado');
    }
  }

  private resolveNextStatus(
    task: TaskView,
    requested: TaskStatus,
    actor: AuthenticatedUser,
  ): TaskStatus {

    switch (task.status) {
      case TaskStatus.TODO:
        if (
          requested === TaskStatus.IN_PROGRESS ||
          requested === TaskStatus.CANCELLED
        ) {
          return requested
        }
        break;
      case TaskStatus.IN_PROGRESS:
        if (
          requested === TaskStatus.WAITING_MANAGER_APPROVE ||
          requested === TaskStatus.TODO ||
          requested === TaskStatus.CANCELLED
        ) {
          return requested
        }
        break;
      case TaskStatus.WAITING_MANAGER_APPROVE:
        if (
          requested === TaskStatus.IN_PROGRESS ||
          requested === TaskStatus.DONE ||
          requested === TaskStatus.CANCELLED
        ) {
          if (
            actor.role !== Role.ADMIN &&
            actor.role !== Role.PROJECT_MANAGER
          ) {
            throw new ForbiddenException(
              'Só o gestor aprova, devolve ou cancela uma tarefa em espera',
            );
          }

          return requested;
        }
        break;
    }
    throw new ConflictException('Transição de status não permitida');
  }

  private civilDayInBrasilia(dueDate: Date): { year: number; day: string } {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dueDate);

    return { year: Number(day.slice(0, 4)), day };
  }
}
