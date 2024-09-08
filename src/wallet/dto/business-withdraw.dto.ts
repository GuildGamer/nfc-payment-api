import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class BusinessWithdrawDto {
  @IsNumber()
  @IsNotEmpty()
  requestedAmount: number;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNumber()
  @IsOptional()
  narration: string;
}
