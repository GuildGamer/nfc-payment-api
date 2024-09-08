import { IsPhoneNumber, IsOptional, IsEmail } from 'class-validator';

export class SendOTPDto {
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email: string;
}
