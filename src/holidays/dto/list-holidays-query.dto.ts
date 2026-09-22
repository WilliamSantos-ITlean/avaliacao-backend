import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ListHolidaysQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;
}
