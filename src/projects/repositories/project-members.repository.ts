import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const memberSelect = {
  id: true,
  projectId: true,
  userId: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
} as const;

@Injectable()
export class ProjectMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProjectAndUser(projectId: string, userId: string) {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  listByProject(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: memberSelect,
    });
  }

  create(
    data: { projectId: string; userId: string },
    tx: Prisma.TransactionClient,
  ) {
    return tx.projectMember.create({
      data,
      select: memberSelect,
    });
  }

  delete(projectId: string, userId: string, tx: Prisma.TransactionClient) {
    return tx.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }
}
