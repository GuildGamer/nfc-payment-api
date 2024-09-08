import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtRefreshStrategy, JwtStrategy } from './strategy';
import {
  BiometricAuthHelper,
  JwtHelper,
  SendEmailHelper,
  TwoFactorAuthentication,
} from './helpers';
import { EmailService } from '../email/email.service';
import {
  ExcludeFieldsHelper,
  OtpHelper,
  TransactionReferenceHelper,
} from '../common/helpers';
import { SmsService } from 'src/sms/sms.service';
import { ConfigService } from '@nestjs/config';
import { CountryExist } from 'src/common/validators/country-exists.validator';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { WalletService } from 'src/wallet/wallet.service';
import { CardExist } from 'src/common/validators';
import { CardService } from 'src/card/card.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { PublicKeyHelper, SendCardEmailHelper } from 'src/card/helpers';
import { ReferralCodeValidatedEvent } from './events';
import { BankTranferHelper, CollectionAccountHelper } from 'src/wallet/helpers';
import { DiscordModule } from 'src/discord/discord.module';
import { UserModule } from 'src/user/user.module';
import { BusinessModule } from 'src/business/business.module';

@Module({
  imports: [
    JwtModule.register({}),
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
    DiscordModule,
    UserModule,
    BusinessModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    SendEmailHelper,
    JwtHelper,
    EmailService,
    OtpHelper,
    TwoFactorAuthentication,
    BiometricAuthHelper,
    ExcludeFieldsHelper,
    SmsService,
    ConfigService,
    CountryExist,
    WalletService,
    CardExist,
    CardService,
    SendCardEmailHelper,
    PushNotificationService,
    PublicKeyHelper,
    ReferralCodeValidatedEvent,
    CollectionAccountHelper,
    BankTranferHelper,
    TransactionReferenceHelper,
  ],
  controllers: [AuthController],
  exports: [SendEmailHelper],
})
export class AuthModule {}
