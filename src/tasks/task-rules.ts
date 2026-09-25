import { ConflictException } from '@nestjs/common';
import { TaskStatus } from '../../generated/prisma/enums';

export const OPEN_TASK_STATUSES = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.WAITING_MANAGER_APPROVE,
] as const;

export function assertTaskAcceptsChanges(status: TaskStatus): void {
  if (status === TaskStatus.DONE || status === TaskStatus.CANCELLED) {
    throw new ConflictException('Tarefa concluída ou cancelada não aceita alterações');
  }
}
