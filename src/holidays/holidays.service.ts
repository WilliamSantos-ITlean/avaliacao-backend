import { BadGatewayException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export type Holiday = { date: string; name: string };

function isHoliday(value: unknown): value is Holiday {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as { date?: unknown; name?: unknown };
  return typeof item.date === 'string' && typeof item.name === 'string';
}

@Injectable()
export class HolidaysService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async listByYear(year: number): Promise<Holiday[]> {
    const baseUrl = this.config.get<string>('HOLIDAYS_API_URL');

    if (!baseUrl) {
      throw new BadGatewayException('HOLIDAYS_API_URL não configurada');
    }

    try {
      const response = await lastValueFrom(
        this.http.get<unknown>(`${baseUrl}/${year}`),
      );

      if (!Array.isArray(response.data) || !response.data.every(isHoliday)) {
        throw new BadGatewayException('Não foi possível consultar os feriados');
      }

      return response.data.map((holiday) => ({
        date: holiday.date,
        name: holiday.name,
      }));
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('Não foi possível consultar os feriados');
    }
  }
}
