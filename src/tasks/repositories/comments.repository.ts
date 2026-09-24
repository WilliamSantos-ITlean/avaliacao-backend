import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const commentSelect = {
  id: true,
  taskId: true,
  authorId: true,
  body: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

export type CommentView = Prisma.CommentGetPayload<{
  select: typeof commentSelect;
}>;

export type CommentWriteData = {
  taskId: string;
  authorId: string;
  body: string;
};

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByTask(taskId: string) {
    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      select: commentSelect,
    });
  }

  findById(id: string) {
    return this.prisma.comment.findUnique({
      where: { id },
      select: commentSelect,
    });
  }

  create(data: CommentWriteData, tx: Prisma.TransactionClient) {
    return tx.comment.create({
      data,
      select: commentSelect,
    });
  }

  delete(id: string, tx: Prisma.TransactionClient) {
    return tx.comment.delete({
      where: { id },
      select: commentSelect,
    });
  }
}
