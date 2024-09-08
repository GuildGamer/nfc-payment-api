import { IsOptional, IsString } from 'class-validator';

export class GetBanksDto {
  @IsOptional()
  @IsString()
  name: string;
}
