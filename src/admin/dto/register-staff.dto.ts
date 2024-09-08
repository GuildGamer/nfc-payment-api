import {
  IsArray,
  IsEmail,
  IsEnum,
  IsLowercase,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { AssignableRoles } from '../../common/types';
import { Transform } from 'class-transformer';
import { toValidPhoneNumber } from 'src/common/helpers';

export class RegisterStaffDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  @IsLowercase()
  @Transform(({ value }) => value?.trim().toLowerCase())
  username: string;

  @IsNotEmpty()
  @IsPhoneNumber()
  @Transform(({ value }) => toValidPhoneNumber(value))
  phoneNumber: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsNumber()
  countryId = 1;

  @IsNotEmpty()
  @IsArray()
  @IsEnum(AssignableRoles, { each: true })
  roles: AssignableRoles[];
}
