import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { TasksRepository, TaskView } from './repositories/tasks.repository';

@Injectable()
export class TaskAccess {
  constructor(private readonly tasksRepository: TasksRepository) {}

  async require(id: string): Promise<TaskView> {
    const task = await this.tasksRepository.findById(id);

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }

    return task;
  }

  hideDeleted(task: TaskView, actor: AuthenticatedUser): void {
    if (task.deletedAt && actor.role !== Role.ADMIN) {
      throw new NotFoundException('Tarefa não encontrada');
    }
  }

  rejectDeleted(task: TaskView, actor: AuthenticatedUser): void {
    this.hideDeleted(task, actor);

    if (task.deletedAt) {
      throw new ConflictException('Tarefa apagada não aceita alterações');
    }
  }
}
