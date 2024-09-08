import { IsPhoneNumber, IsNotEmpty, IsString } from 'class-validator';

export class EditPhoneDto {
  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
