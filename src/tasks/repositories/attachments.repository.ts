import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const attachmentSelect = {
  id: true,
  taskId: true,
  uploadedById: true,
  filename: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

export type AttachmentView = Prisma.AttachmentGetPayload<{
  select: typeof attachmentSelect;
}>;

export type AttachmentWriteData = {
  taskId: string;
  uploadedById: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
};

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        taskId: true,
        filename: true,
        mimeType: true,
        path: true,
      },
    });
  }

  listByTask(taskId: string) {
    return this.prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      select: attachmentSelect,
    });
  }

  create(data: AttachmentWriteData, tx: Prisma.TransactionClient) {
    return tx.attachment.create({
      data,
      select: attachmentSelect,
    });
  }
}
