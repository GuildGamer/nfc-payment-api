import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { toNumber } from 'src/common/helpers';

export class GetStationsDto {
  @IsOptional()
  @IsString()
  term: string;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  take = 20;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  start = 0;
}
