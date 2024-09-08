import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { CardIsUnattached } from 'src/common/validators';

export class AddNFCCardDto {
  @IsString()
  @IsNotEmpty()
  @Validate(CardIsUnattached)
  nfcCardNumber: string;

  @IsOptional()
  @IsString()
  pin?: string;

  @IsString()
  @IsOptional()
  walletId: string;

  @IsString()
  @IsOptional()
  name: string;
}
