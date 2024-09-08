import { CacheModule, Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { ConfigService } from '@nestjs/config';
import { OtpHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';
import { SendEmailHelper } from './helpers';

@Module({
  imports: [CacheModule.register()],
  controllers: [BusinessController],
  providers: [
    BusinessService,
    ConfigService,
    OtpHelper,
    EmailService,
    SendEmailHelper,
  ],
  exports: [BusinessService],
})
export class BusinessModule {}
