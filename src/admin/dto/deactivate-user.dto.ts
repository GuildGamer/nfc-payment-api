import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeactivateUserDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsBoolean()
  @IsOptional()
  permanent: false;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
