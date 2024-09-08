import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class WithdrawIntoBankAccountDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(100)
  requestedAmount: number;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNumber()
  @IsOptional()
  narration: string;
}
