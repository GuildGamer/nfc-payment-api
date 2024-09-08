import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { BankExist } from 'src/common/validators';

export class AddBankAcountDto {
  @IsString()
  @IsNotEmpty()
  @Validate(BankExist)
  bankSlug: string;

  @IsString()
  @IsNotEmpty()
  number: string;
}
