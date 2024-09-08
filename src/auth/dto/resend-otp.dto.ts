import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, ValidateIf } from 'class-validator';
import { toValidPhoneNumber } from 'src/common/helpers';

export class ResendOtpDto {
  @ValidateIf((o) => !o.email)
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => toValidPhoneNumber(value))
  phoneNumber: string;

  @ValidateIf((o) => !o.phoneNumber)
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
