import { IsNotEmpty, IsNumber } from 'class-validator';

export class FundWalletWithBankTransferDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
