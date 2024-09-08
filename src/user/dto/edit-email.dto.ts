import { IsOptional, IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class EditEmailDto {
  @IsOptional()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
