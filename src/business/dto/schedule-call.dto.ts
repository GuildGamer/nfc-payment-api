import { IsString } from '@nestjs/class-validator';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ScheduleCallDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
