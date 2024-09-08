import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional } from 'class-validator';
import { toDate } from 'src/common/helpers';

export class GetDashboardDataDto {
  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  fromDate: Date;

  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  toDate: Date;

  @IsOptional()
  @IsBoolean()
  active: boolean;
}
