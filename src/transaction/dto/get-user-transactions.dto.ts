import { Transform } from 'class-transformer';
import { IsOptional, IsDate, IsNumber } from 'class-validator';
import { toDate, toNumber } from 'src/common/helpers';

export class GetUserTransactionsDto {
  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  fromDate: Date;

  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  toDate: Date;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  take: number;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  start = 0;
}
