import { Transform } from 'class-transformer';
import {
  IsPhoneNumber,
  ValidateIf,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { toValidPhoneNumber } from 'src/common/helpers';

export class InitPasswordResetDto {
  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber()
  @Transform(({ value }) => toValidPhoneNumber(value))
  @ValidateIf((o) => !o.email)
  phoneNumber: string;
}
