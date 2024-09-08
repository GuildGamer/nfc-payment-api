import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { BankExist } from 'src/common/validators';

export class UpdateBankDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsNotEmpty()
  @Validate(BankExist)
  slug: string;

  @IsOptional()
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  ussd: string;
}
