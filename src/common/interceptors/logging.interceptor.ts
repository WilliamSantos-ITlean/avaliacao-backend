import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; url: string }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<{ statusCode: number }>();
          this.write(request, response.statusCode, startedAt);
        },
        error: (error: unknown) => {
          const status = error instanceof HttpException ? error.getStatus() : 500;
          this.write(request, status, startedAt);
        },
      }),
    );
  }

  private write(
    request: { method: string; url: string },
    status: number,
    startedAt: number,
  ): void {
    this.logger.log(
      `${request.method} ${request.url} ${status} ${Date.now() - startedAt}ms`,
    );
  }
}
