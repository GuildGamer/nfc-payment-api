import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class JoinWaitListDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  fullName: string;
}
