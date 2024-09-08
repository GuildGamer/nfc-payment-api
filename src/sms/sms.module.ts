import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Module({
  providers: [SmsService, ConfigService, JwtService],
})
export class SmsModule {}
