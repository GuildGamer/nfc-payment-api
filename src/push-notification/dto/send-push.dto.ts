import { IsNotEmpty, IsString } from 'class-validator';

export class SendPushDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  body: string;
}
