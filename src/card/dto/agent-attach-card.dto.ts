import { IsNotEmpty, IsString } from 'class-validator';
import { AddNFCCardDto } from './add-nfc-card.dto';

export class AgentAttachNFCCardDto extends AddNFCCardDto {
  @IsString()
  @IsNotEmpty()
  userUniqueIdentifier: string;

  @IsString()
  @IsNotEmpty()
  OTP: string;
}
