import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SmsModule } from './sms/sms.module';
import { UserModule } from './user/user.module';
import { ThrottlerModule } from '@nestjs/throttler';
import type { RedisClientOptions } from 'redis';
import { CardModule } from './card/card.module';
import * as redisStore from 'cache-manager-redis-store';
import { PushNotificationModule } from './push-notification/push-notification.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { WalletModule } from './wallet/wallet.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TransactionModule } from './transaction/transaction.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PaymentModule } from './payment/payment.module';
import { AppNotificationsModule } from './app-notifications/app-notifications.module';
import { DiscordModule } from './discord/discord.module';
// import { ProxyModule } from './proxy/proxy.module';
import { BusinessModule } from './business/business.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './common/cron/cron.service';
import { FilesModule } from './files/files.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';

@Module({
  imports: [
    AuthModule,
    AppNotificationsModule,
    SmsModule,
    PrismaModule,
    TransactionModule,
    EmailModule,
    WalletModule,
    UserModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    CacheModule.register<RedisClientOptions>({
      store: redisStore,

      // Store-specific configuration:
      host: 'localhost',
      port: 6379,
    }),
    CardModule,
    PushNotificationModule,
    AdminModule,
    ChatModule,
    TransactionModule,
    WebhooksModule,
    PaymentModule,
    DiscordModule,
    BusinessModule,
    ScheduleModule.forRoot(),
    FilesModule,
    // ProxyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CronService,
    // {
    //   provide: APP_FILTER,
    //   useClass: AllExceptionsFilter,
    // },
  ],
})
export class AppModule {}
