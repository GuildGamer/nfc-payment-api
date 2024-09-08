import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PushNotificationService } from './push-notification.service';
import { GetUser, Roles } from 'src/common/decorator';
import { JwtGuard, RolesGuard } from 'src/common/guard';
import { SavePushNotificationTokenDto } from './dto';
import { Role } from '@prisma/client';

@Controller('push-notification')
export class PushNotificationController {
  constructor(private pushNotificationService: PushNotificationService) {}

  @Post('save-registeration-token')
  @HttpCode(200)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  savePushNotificationToken(
    @Body() savePushNotificationTokenDto: SavePushNotificationTokenDto,
    @GetUser('id') userId: string,
  ) {
    return this.pushNotificationService.savePushNotificationToken(
      userId,
      savePushNotificationTokenDto,
    );
  }

  @Get('my-registration-tokens')
  @HttpCode(200)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  getPushNotificationTokens(@GetUser('id') userId: string) {
    return this.pushNotificationService.getPushNotificationToken(userId);
  }

  @Delete('remove-registration-token/:id')
  @HttpCode(200)
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.MERCHANT)
  removePushNotificationToken(@Param('id') id: string) {
    return this.pushNotificationService.removePushNotificationToken(id);
  }

  // @Get('send/:registrationToken')
  // @HttpCode(200)
  // @UseGuards(JwtGuard, RolesGuard)
  // @Roles(Role.CUSTOMER, Role.MERCHANT)
  // sendPushNotification(@Param('registrationTo') regiterationId: string) {
  //   return this.pushNotificationService.sendPushNotification(regiterationId);
  // }
}
