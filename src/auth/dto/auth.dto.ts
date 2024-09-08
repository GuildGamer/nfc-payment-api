import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { toValidPhoneNumber } from 'src/common/helpers';

export class AuthDto {
  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => toValidPhoneNumber(value))
  phoneNumber: string;

  @ValidateIf((o) => !o.deviceId)
  @IsOptional()
  @IsString()
  pin: string;

  @ValidateIf((o) => !o.pin)
  @IsOptional()
  @IsString()
  deviceId: string;

  @IsOptional()
  @IsBoolean()
  firstLogin: boolean;
}
