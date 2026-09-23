import {
  BadRequestException,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { ApiJwt, ApiNotAMember, ApiUuidParam } from '../common/swagger';
import { AttachmentsService, type UploadedImage } from './attachments.service';
import { ImageUploadExceptionFilter } from './image-upload.filter';
import {
  IMAGE_MIME,
  IMAGE_REQUIRED,
  IMAGE_TOO_BIG,
  IMAGE_WRONG_TYPE,
  MAX_IMAGE_BYTES,
} from './image-upload.rules';

@ApiTags('Anexos')
@ApiJwt()
@Controller('tasks/:id/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Imagem no campo file. JPEG ou PNG, até 2 MB.',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Arquivo JPEG ou PNG.' },
      },
    },
  })
  @ApiOperation({
    summary: 'Enviar imagem da tarefa',
    description:
      'Membro do projeto ou ADMIN. Sem arquivo, tipo errado ou acima de 2 MB volta 400. Projeto ARCHIVED volta 409.',
  })
  @ApiCreatedResponse({ description: 'Anexo gravado e ligado à tarefa.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  @ApiConflictResponse({ description: 'Projeto arquivado não aceita novas imagens.' })
  @UseFilters(ImageUploadExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        exceptionFactory: (error: string) =>
          new BadRequestException(
            error === 'File is required' ? IMAGE_REQUIRED : error,
          ),
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_IMAGE_BYTES + 1,
            errorMessage: IMAGE_TOO_BIG,
          }),
          new FileTypeValidator({
            fileType: IMAGE_MIME,
            overrideMimeType: true,
            errorMessage: IMAGE_WRONG_TYPE,
          }),
        ],
      }),
    )
    file: UploadedImage,
  ) {
    return this.attachmentsService.create(id, file, user);
  }

  @Get()
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiOperation({
    summary: 'Listar anexos',
    description: 'Metadados (nome, tipo, tamanho). Os bytes vêm em GET .../attachments/:attachmentId.',
  })
  @ApiOkResponse({ description: 'Anexos da tarefa, sem o binário.' })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa não encontrada.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attachmentsService.list(id, user);
  }

  @Get(':attachmentId')
  @ApiUuidParam('id', 'Id da tarefa.')
  @ApiUuidParam('attachmentId', 'Id do anexo.')
  @ApiOperation({
    summary: 'Abrir a imagem',
    description: 'Devolve os bytes, com Content-Type image/jpeg ou image/png. Membro do projeto ou ADMIN.',
  })
  @ApiProduces('image/jpeg', 'image/png')
  @ApiOkResponse({
    description: 'Arquivo da imagem.',
    content: {
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiNotAMember()
  @ApiNotFoundResponse({ description: 'Tarefa ou anexo não encontrado.' })
  async open(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.attachmentsService.open(id, attachmentId, user);
    const ascii = file.filename.replace(/[^\w.\- ()]/g, '_') || 'imagem';

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );

    return new StreamableFile(file.buffer);
  }
}
