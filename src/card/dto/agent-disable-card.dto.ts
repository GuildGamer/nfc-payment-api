import { IsNotEmpty, IsString } from 'class-validator';

export class AgentDisableNFCCardDto {
  @IsString()
  @IsNotEmpty()
  nfcCardNumber?: string;

  @IsString()
  @IsNotEmpty()
  OTP: string;
}
