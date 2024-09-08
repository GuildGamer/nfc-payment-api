import { Module } from '@nestjs/common';
import { CardController } from './card.controller';
import { CardService } from './card.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { CardExist, CardIsUnattached } from 'src/common/validators';
import { PublicKeyHelper, SendCardEmailHelper } from './helpers';
import { ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { OtpHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';

@Module({
  imports: [UserModule],
  controllers: [CardController],
  providers: [
    OtpHelper,
    CardService,
    PushNotificationService,
    CardExist,
    PublicKeyHelper,
    CardIsUnattached,
    ConfigService,
    SendCardEmailHelper,
    EmailService,
  ],
})
export class CardModule {}
