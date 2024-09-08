import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmailBody {
  @IsNotEmpty()
  @IsEmail()
  to: string;

  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
