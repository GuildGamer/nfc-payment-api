import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';
import { toNumber } from 'src/common/helpers';

export class GetStationTransactionsDto {
  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  take = 20;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  start = 0;
}
