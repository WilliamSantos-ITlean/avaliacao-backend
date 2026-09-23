import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { IMAGE_TOO_BIG } from './image-upload.rules';

/**
 * O Multer corta arquivo acima de 2 MB com 413. O contrato da avaliação
 * pede 400 para tamanho inválido, então esta rota traduz esse caso.
 */
@Catch(PayloadTooLargeException)
export class ImageUploadExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: IMAGE_TOO_BIG,
      error: 'Bad Request',
    });
  }
}
