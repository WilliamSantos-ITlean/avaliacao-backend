import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UnitOfWork } from '../prisma/unit-of-work';
import { ActivityAction } from '../projects/activity-actions';
import { ProjectAccessService } from '../projects/project-access.service';
import { ActivitiesRepository } from '../projects/repositories/activities.repository';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsRepository } from './repositories/comments.repository';
import { TasksRepository, TaskView } from './repositories/tasks.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly unitOfWork: UnitOfWork,
    private readonly tasksRepository: TasksRepository,
    private readonly commentsRepository: CommentsRepository,
    private readonly activitiesRepository: ActivitiesRepository,
  ) {}

  async create(taskId: string, dto: CreateCommentDto, user: AuthenticatedUser) {
    const task = await this.requireTask(taskId);
    const { actor, project } = await this.access.authorize(
      task.projectId,
      user,
    );

    this.rejectDeletedTask(task, actor);
    this.access.assertOpenForChanges(project);

    return this.unitOfWork.run(async (tx) => {
      const comment = await this.commentsRepository.create(
        {
          taskId: task.id,
          authorId: actor.id,
          body: dto.body,
        },
        tx,
      );

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.COMMENT_CREATED,
          projectId: task.projectId,
          taskId: task.id,
          metadata: { commentId: comment.id },
        },
        tx,
      );

      return comment;
    });
  }

  async remove(taskId: string, commentId: string, user: AuthenticatedUser) {
    const task = await this.requireTask(taskId);
    const { actor, project } = await this.access.authorize(task.projectId, user);
    this.rejectDeletedTask(task, actor);
    this.access.assertOpenForChanges(project);
    const comment = await this.commentsRepository.findById(commentId);

    if (!comment || comment.taskId !== task.id) {
      throw new NotFoundException('Comentário não encontrado');
    }

    if (comment.authorId !== actor.id && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Só o autor ou o ADMIN apaga este comentário');
    }

    return this.unitOfWork.run(async (tx) => {
      const removed = await this.commentsRepository.delete(comment.id, tx);

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.COMMENT_DELETED,
          projectId: task.projectId,
          taskId: task.id,
          metadata: { commentId: comment.id },
        },
        tx,
      );

      return removed;
    });
  }

  async list(taskId: string, user: AuthenticatedUser) {
    const task = await this.requireTask(taskId);
    const { actor } = await this.access.authorize(task.projectId, user);
    this.hideDeletedTask(task, actor);
    return this.commentsRepository.listByTask(task.id);
  }

  private hideDeletedTask(
    task: TaskView,
    actor: AuthenticatedUser,
  ): void {
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
}
