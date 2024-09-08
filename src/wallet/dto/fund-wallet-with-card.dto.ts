import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FundWalletWithCardDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  transactionReference: string;
}
