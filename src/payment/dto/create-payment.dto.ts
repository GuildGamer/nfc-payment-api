import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsOptional()
  driverWalletId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  cardId: number;

  @IsString()
  @IsNotEmpty()
  privateKey: string;

  @ValidateIf((o) => o.amount > 500)
  @IsString()
  @IsNotEmpty()
  password: string;
}
