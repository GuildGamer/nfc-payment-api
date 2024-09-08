import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AddNotificationDto } from './dto';
import { CustomResponse } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AppNotificationsService {
  constructor(private prisma: PrismaService) {}

  async addNotification(
    addNotificationDto: AddNotificationDto,
  ): Promise<CustomResponse> {
    try {
      const notification = await this.prisma.notification.create({
        data: { ...addNotificationDto },
      });

      return <CustomResponse>{
        success: true,
        msg: 'successfully added notification',
        data: notification,
      };
    } catch (error) {
      console.log('ERROR');
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'error',
        data: null,
      });
    }
  }
}
