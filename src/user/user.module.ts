import { CacheModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExcludeFieldsHelper, OtpHelper } from 'src/common/helpers';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtHelper, SendEmailHelper } from 'src/auth/helpers';
import { SmsService } from 'src/sms/sms.service';
import { EmailService } from 'src/email/email.service';
// import { APP_GUARD } from '@nestjs/core';
// import { ThrottlerGuard } from '@nestjs/throttler';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { BankExist } from 'src/common/validators';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATIONS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'cats_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
    CacheModule.register(),
    DiscordModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    ConfigService,
    ExcludeFieldsHelper,
    ConfigService,
    SendEmailHelper,
    JwtService,
    JwtHelper,
    OtpHelper,
    SmsService,
    EmailService,
    BankExist,
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
  exports: [UserService],
})
export class UserModule {}
