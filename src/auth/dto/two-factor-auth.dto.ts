import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { TwoFactorAuthTypes } from '../types';

export class EnableTwoFactorAuthDto {
  @IsString()
  @IsOptional()
  @IsEnum(TwoFactorAuthTypes)
  twoFactorAuthType: TwoFactorAuthTypes;
}

export class TwoFactorAuthForAppDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
