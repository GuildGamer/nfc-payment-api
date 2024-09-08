import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { toDate, toNumber } from '../../common/helpers';
import { Role } from '@prisma/client';

export class GetUsersDto {
  @IsOptional()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  username: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsBoolean()
  active: boolean;

  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  createdAtDateStart: Date;

  @IsOptional()
  @Transform(({ value }) => toDate(value))
  @IsDate()
  createdAtDateEnd: Date;

  @IsOptional()
  @IsEnum(Role, {
    message: `Valid options are ${Object.values(Role)}`,
  })
  role: Role;

  @IsOptional()
  @IsBoolean()
  emailVerified: boolean;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  take: number;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @IsOptional()
  start = 0;

  @IsOptional()
  @IsBoolean()
  phoneNumberVerified: boolean;

  @IsOptional()
  @IsBoolean()
  identityIsVerified: boolean;
}
