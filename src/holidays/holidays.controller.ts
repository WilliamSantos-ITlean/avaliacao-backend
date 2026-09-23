import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { ApiJwt } from '../common/swagger';
import { ListHolidaysQueryDto } from './dto/list-holidays-query.dto';
import { HolidaysService } from './holidays.service';

@ApiTags('Feriados')
@ApiJwt()
@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar feriados do ano',
    description:
      'Qualquer usuário autenticado. A URL da API externa vem do ambiente. Falha ou timeout voltam 502, não 500 solto. O prazo da tarefa usa esta mesma fonte e, se cair num feriado, volta 409 na tarefa.',
  })
  @ApiOkResponse({ description: 'Feriados do ano pedido.' })
  @ApiBadGatewayResponse({
    description: 'HOLIDAYS_API_URL ausente, ou a API externa falhou ou estourou o tempo.',
  })
  list(@Query() query: ListHolidaysQueryDto) {
    return this.holidaysService.listByYear(query.year);
  }
}
