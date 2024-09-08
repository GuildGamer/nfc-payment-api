import { Transform } from 'class-transformer';
import { IsOptional, IsDate, IsNumber } from 'class-validator';
import { toDate } from 'src/common/helpers';

export class GetNFCCardsDto {
  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  fromDate: Date;

  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  toDate: Date;

  @IsNumber()
  @IsOptional()
  take: number;

  @IsNumber()
  @IsOptional()
  start = 0;
}
