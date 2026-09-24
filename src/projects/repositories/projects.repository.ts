import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ProjectStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

export type ProjectWriteData = {
  name: string;
  description: string | null;
  ownerId: string;
};

export type ProjectPatchData = {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
};

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.project.findUnique({ where: { id } });
  }

  findAll() {
    return this.prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findDeleted() {
    return this.prisma.project.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
  }

  findByMember(userId: string) {
    return this.prisma.project.findMany({
      where: { deletedAt: null, members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: ProjectWriteData, tx: Prisma.TransactionClient) {
    return tx.project.create({ data });
  }

  update(id: string, data: ProjectPatchData, tx: Prisma.TransactionClient) {
    return tx.project.update({ where: { id }, data });
  }

  softDelete(id: string, tx: Prisma.TransactionClient) {
    return tx.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
