import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

type Incoming = {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private warnedMissingConfig = false;

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('API_KEY');
    if (!expected) {
      this.warnOnce();
      throw new UnauthorizedException('Header x-api-key ausente ou inválido.');
    }

    const request = context.switchToHttp().getRequest<Incoming>();
    const header = request.headers['x-api-key'];
    const provided = Array.isArray(header) ? header[0] : header;

    if (!provided || !this.sameSecret(provided, expected)) {
      throw new UnauthorizedException('Header x-api-key ausente ou inválido.');
    }

    return true;
  }

  private sameSecret(provided: string, expected: string): boolean {
    const left = Buffer.from(provided);
    const right = Buffer.from(expected);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }

  private warnOnce() {
    if (this.warnedMissingConfig) return;
    this.warnedMissingConfig = true;
    this.logger.warn('API_KEY não está no ambiente. Toda rota responde 401.');
  }
}
