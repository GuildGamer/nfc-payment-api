import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class SendPaymentDto {
  @IsNotEmpty()
  @IsString()
  recipientUniqueIdentifier: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
