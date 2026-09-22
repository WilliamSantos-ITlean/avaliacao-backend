import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';

@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  controllers: [HolidaysController],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
