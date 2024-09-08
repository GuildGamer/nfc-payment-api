import { IsBoolean, IsOptional, IsString, Validate } from 'class-validator';
import { CardExist } from 'src/common/validators';

export class UpdateNFCCardDto {
  @IsString()
  @IsOptional()
  @Validate(CardExist)
  nfcCardNumber: string;

  @IsOptional()
  @IsString()
  pin?: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsBoolean()
  @IsOptional()
  active: boolean;
}
