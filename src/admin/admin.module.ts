import { CacheModule, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';

@Module({
  imports: [CacheModule.register()],
  controllers: [AdminController],
  providers: [AdminService, ConfigService, EmailService],
})
export class AdminModule {}
