import { Injectable, NotFoundException } from '@nestjs/common';
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
    const { actor } = await this.access.authorize(task.projectId, user);

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

  async list(taskId: string, user: AuthenticatedUser) {
    const task = await this.requireTask(taskId);
    await this.access.authorize(task.projectId, user);
    return this.commentsRepository.listByTask(task.id);
  }

  private async requireTask(id: string): Promise<TaskView> {
    const task = await this.tasksRepository.findById(id);

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return task;
  }
}
