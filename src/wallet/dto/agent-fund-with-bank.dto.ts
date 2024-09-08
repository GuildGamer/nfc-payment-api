import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AgentFundWalletWithBankTransferDto {
  @IsString()
  @IsNotEmpty()
  uniqueIdentifier: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  amount: number;
}
