import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SavePushNotificationTokenDto {
  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsNotEmpty()
  @IsString()
  notificationToken: string;
}
