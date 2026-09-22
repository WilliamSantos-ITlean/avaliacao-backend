import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { ListHolidaysQueryDto } from './dto/list-holidays-query.dto';
import { HolidaysService } from './holidays.service';

@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  list(@Query() query: ListHolidaysQueryDto) {
    return this.holidaysService.listByYear(query.year);
  }
}
