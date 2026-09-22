import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { TaskStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

const taskSelect = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  status: true,
  assigneeId: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignee: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

export type TaskView = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export type TaskWriteData = {
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  dueDate: Date | null;
};

export type TaskPatchData = {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: Date | null;
  status?: TaskStatus;
};

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      select: taskSelect,
    });
  }

  listByProject(projectId: string) {
    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: taskSelect,
    });
  }

  create(data: TaskWriteData, tx: Prisma.TransactionClient) {
    return tx.task.create({
      data,
      select: taskSelect,
    });
  }

  update(id: string, data: TaskPatchData, tx: Prisma.TransactionClient) {
    return tx.task.update({
      where: { id },
      data,
      select: taskSelect,
    });
  }
}
