import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { toNumber } from 'src/common/helpers';

export class SearchUsersDto {
  @IsNotEmpty()
  @IsString()
  term: string;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  take: number;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  start = 0;
}
