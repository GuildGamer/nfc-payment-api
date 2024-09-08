import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ConfigService } from '@nestjs/config';
import {
  BankTransferEvent,
  CardPaymentEvent,
  WalletChargedEvent,
  WalletFundedEvent,
} from './events';
import { WebhooksService } from './webhooks.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { CollectionAccountHelper } from 'src/wallet/helpers';
import { TransactionReferenceHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';
import { DiscordService } from 'src/discord/discord.service';

@Module({
  providers: [
    ConfigService,
    DiscordService,
    WebhooksService,
    BankTransferEvent,
    CardPaymentEvent,
    WalletFundedEvent,
    PushNotificationService,
    TransactionReferenceHelper,
    WalletChargedEvent,
    CollectionAccountHelper,
    EmailService,
  ],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
