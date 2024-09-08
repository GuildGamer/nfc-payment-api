import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { UserModule } from 'src/user/user.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { CardIdExist, WalletExist } from 'src/common/validators';
import { ConfigService } from '@nestjs/config';
import { TransactionReferenceHelper } from 'src/common/helpers';
import { PushNotificationModule } from 'src/push-notification/push-notification.module';
import { WalletCreditedEvent } from './events';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  providers: [
    PaymentService,
    WalletExist,
    CardIdExist,
    ConfigService,
    TransactionReferenceHelper,
    WalletCreditedEvent,
  ],
  controllers: [PaymentController],
  imports: [
    UserModule,
    TransactionModule,
    WalletModule,
    PushNotificationModule,
    DiscordModule,
  ],
})
export class PaymentModule {}
