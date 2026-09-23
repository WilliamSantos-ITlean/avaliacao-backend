import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AttachmentStorage {
  private readonly logger = new Logger(AttachmentStorage.name);

  constructor(private readonly config: ConfigService) {}

  async save(
    taskId: string,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<string> {
    if (!this.isSafeSegment(taskId)) {
      throw new BadRequestException('Tarefa inválida');
    }

    const extension = file.mimetype === 'image/png' ? '.png' : '.jpg';
    const storedName = `${randomUUID()}${extension}`;
    const directory = join(this.root(), taskId);

    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, storedName), file.buffer);

    return `${taskId}/${storedName}`;
  }

  async read(relativePath: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolveInsideRoot(relativePath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  async remove(relativePath: string): Promise<void> {
    try {
      await unlink(this.resolveInsideRoot(relativePath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'ENOENT') {
        this.logger.warn(`Não apaguei o arquivo órfão ${relativePath}`);
      }
    }
  }

  private root(): string {
    const configured = this.config.get<string>('UPLOAD_DIR')?.trim();

    if (configured) {
      return resolve(configured);
    }

    return resolve(process.cwd(), 'uploads');
  }

  private resolveInsideRoot(relativePath: string): string {
    const root = this.root();
    const absolute = resolve(root, relativePath);
    const inside = absolute === root || absolute.startsWith(root + sep);

    if (!inside || relativePath.includes('..')) {
      throw new BadRequestException('Caminho de arquivo inválido');
    }

    return absolute;
  }

  private isSafeSegment(value: string): boolean {
    return value.length > 0 && !value.includes('..') && !/[\\/]/.test(value);
  }
}
