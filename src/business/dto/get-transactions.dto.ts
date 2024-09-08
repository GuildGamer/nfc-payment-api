import { Transform } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { toDate, toNumber } from 'src/common/helpers';

export class GetTransactionsDto {
  @IsOptional()
  @IsString()
  term: string;

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
  take = 20;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  start = 0;
}
