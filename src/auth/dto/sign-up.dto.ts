import { ValidateIf } from '@nestjs/class-validator';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
  Matches,
  Validate,
} from 'class-validator';
import { toValidPhoneNumber } from 'src/common/helpers';
import { SignUpRoles } from 'src/common/types';
import { CardExist } from 'src/common/validators';
import { CountryExist } from 'src/common/validators/country-exists.validator';

export class SignUpDto {
  @IsNotEmpty()
  @IsEnum(SignUpRoles)
  role: SignUpRoles;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  username: string;

  @IsNotEmpty()
  @IsNumber()
  @Validate(CountryExist)
  countryId: number;

  @IsNotEmpty()
  @IsPhoneNumber('NG')
  @Transform(({ value }) => toValidPhoneNumber(value))
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  referralCode: string;

  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.trim())
  email: string;

  @IsOptional()
  @ValidateIf((o) => o.cardNumber && o.cardNumber.length !== 0)
  @Validate(CardExist)
  nfcCardNumber: string;

  @ValidateIf((o) => o.role !== Role.BUSINESS)
  @IsNotEmpty({ message: 'Pin is required' })
  @IsString()
  @Length(6, 6, {
    message: 'Pin must be 6 digits long',
  })
  @Matches(/[0-9]/, {
    message: 'Pin must be a combination of digits',
  })
  pin: string;

  @ValidateIf((o) => o.role === Role.BUSINESS)
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, a number and a special character',
  })
  password: string;
}
