import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePushNotificationDto {
  @IsNotEmpty()
  @IsString()
  deviceType: string;
}
