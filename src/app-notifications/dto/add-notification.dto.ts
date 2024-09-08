import { IsBoolean, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { NotificationTypes } from '../types/notification-types.enum';

export class AddNotificationDto {
  @IsNotEmpty()
  @IsEnum(NotificationTypes, {
    message: `Valid options are ${Object.values(NotificationTypes)}`,
  })
  type: NotificationTypes;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsBoolean()
  actionable: boolean;
}
