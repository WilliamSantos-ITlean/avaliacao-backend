import {
  BadRequestException,
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
import { TaskAccess } from './task-access';
import { AttachmentStorage } from './attachment-storage';
import {
  IMAGE_MIME,
  IMAGE_REQUIRED,
  IMAGE_TOO_BIG,
  IMAGE_WRONG_TYPE,
  MAX_IMAGE_BYTES,
} from './image-upload.rules';
import { AttachmentsRepository } from './repositories/attachments.repository';
import { assertTaskAcceptsChanges } from './task-rules';

export type UploadedImage = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly tasks: TaskAccess,
    private readonly storage: AttachmentStorage,
    private readonly unitOfWork: UnitOfWork,
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly activitiesRepository: ActivitiesRepository,
  ) {}

  async create(taskId: string, file: UploadedImage, user: AuthenticatedUser) {
    this.assertImage(file);

    const task = await this.tasks.require(taskId);
    const { actor, project } = await this.access.authorize(
      task.projectId,
      user,
    );

    this.tasks.rejectDeleted(task, actor);
    this.access.assertOpenForChanges(project);
    assertTaskAcceptsChanges(task.status);

    const storedPath = await this.storage.save(task.id, file);

    try {
      return await this.unitOfWork.run(async (tx) => {
        const attachment = await this.attachmentsRepository.create(
          {
            taskId: task.id,
            uploadedById: actor.id,
            filename: this.displayName(file.originalname, file.mimetype),
            mimeType: file.mimetype,
            size: file.size,
            path: storedPath,
          },
          tx,
        );

        await this.activitiesRepository.record(
          {
            actorId: actor.id,
            action: ActivityAction.ATTACHMENT_UPLOADED,
            projectId: task.projectId,
            taskId: task.id,
            metadata: {
              attachmentId: attachment.id,
              filename: attachment.filename,
            },
          },
          tx,
        );

        return attachment;
      });
    } catch (error) {
      await this.storage.remove(storedPath);
      throw error;
    }
  }

  async remove(taskId: string, attachmentId: string, user: AuthenticatedUser) {
    const task = await this.tasks.require(taskId);
    const { actor, project } = await this.access.authorize(task.projectId, user);
    this.tasks.rejectDeleted(task, actor);
    this.access.assertOpenForChanges(project);
    assertTaskAcceptsChanges(task.status);
    const attachment = await this.attachmentsRepository.findById(attachmentId);

    if (!attachment || attachment.taskId !== task.id) {
      throw new NotFoundException('Anexo não encontrado');
    }

    if (attachment.uploadedById !== actor.id && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Só quem enviou ou o ADMIN apaga esta imagem');
    }

    const removed = await this.unitOfWork.run(async (tx) => {
      const deleted = await this.attachmentsRepository.delete(attachment.id, tx);

      await this.activitiesRepository.record(
        {
          actorId: actor.id,
          action: ActivityAction.ATTACHMENT_DELETED,
          projectId: task.projectId,
          taskId: task.id,
          metadata: {
            attachmentId: attachment.id,
            filename: attachment.filename,
          },
        },
        tx,
      );

      return deleted;
    });

    await this.storage.remove(attachment.path);
    return removed;
  }

  async list(taskId: string, user: AuthenticatedUser) {
    const task = await this.tasks.require(taskId);
    const { actor } = await this.access.authorize(task.projectId, user);
    this.tasks.hideDeleted(task, actor);
    return this.attachmentsRepository.listByTask(task.id);
  }

  async open(taskId: string, attachmentId: string, user: AuthenticatedUser) {
    const task = await this.tasks.require(taskId);
    const { actor } = await this.access.authorize(task.projectId, user);
    this.tasks.hideDeleted(task, actor);

    const attachment = await this.attachmentsRepository.findById(attachmentId);

    if (
      !attachment ||
      attachment.taskId !== task.id ||
      !IMAGE_MIME.test(attachment.mimeType)
    ) {
      throw new NotFoundException('Anexo não encontrado');
    }

    const buffer = await this.storage.read(attachment.path);

    if (!buffer) {
      throw new NotFoundException('Imagem não encontrada');
    }

    return {
      buffer,
      mimeType: attachment.mimeType,
      filename: attachment.filename,
    };
  }

  private assertImage(file: UploadedImage): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException(IMAGE_REQUIRED);
    }

    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(IMAGE_TOO_BIG);
    }

    if (!IMAGE_MIME.test(file.mimetype)) {
      throw new BadRequestException(IMAGE_WRONG_TYPE);
    }
  }

  private displayName(original: string, mimetype: string): string {
    const fallback = mimetype === 'image/png' ? 'imagem.png' : 'imagem.jpg';
    const base = (original ?? '').split(/[/\\]/).pop()?.trim() ?? '';
    const cleaned = base.replace(/[^\w.\- ()]/g, '_').slice(0, 180);

    return cleaned || fallback;
  }
}
