import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddBankDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  ussd: string;
}
