import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ActivityRecord = {
  actorId: string;
  action: string;
  projectId: string;
  taskId?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class ActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  record(input: ActivityRecord, tx: Prisma.TransactionClient) {
    return tx.activity.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        projectId: input.projectId,
        taskId: input.taskId,
        metadata: input.metadata,
      },
    });
  }

  listByProject(projectId: string) {
    return this.prisma.activity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        actorId: true,
        action: true,
        projectId: true,
        taskId: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }
}
