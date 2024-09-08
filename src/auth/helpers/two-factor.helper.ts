import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { JwtHelper } from './jwt.helper';
import { lastValueFrom } from 'rxjs';
import { OtpHelper } from 'src/common/helpers';
import { OTPEnum } from 'src/common/types';

@Injectable()
export class TwoFactorAuthentication {
  constructor(
    private jwtHelper: JwtHelper,
    private otpHelper: OtpHelper,
    private config: ConfigService,
    @Inject('NOTIFICATIONS_SERVICE') private notificationsClient: ClientProxy,
  ) {}

  async verifyWithOtp(user: User) {
    const generatedOtp = await this.otpHelper.generateOtp(
      user.id,
      OTPEnum.TWO_FACTOR_AUTH,
      user.email,
    );

    const email = {
      body: {
        title: 'Red Onion Two Factor Authentication',
        name: `Hi, ${user.firstName + ' ' + user.lastName}`,
        intro: [
          `Use this OTP to verify your login <h1 style="color:black;"><b>${generatedOtp}</b></h1>`,
        ],
        outro:
          "Need help, or have questions? Just reply to this email, we'd love to help.",
      },
    };

    const emailHtmlBody = mailGenerator.generate(email);

    const mail: EmailBody = {
      to: user.email,
      subject: 'Red Onion OTP',
      content: emailHtmlBody,
    };

    const options = new RmqRecordBuilder(mail)
      .setOptions({
        headers: {
          ['authorization']: (
            await this.jwtHelper.signToken(this.config.get('SERVICE_ID'))
          ).token,
        },
      })
      .build();

    const result = await lastValueFrom(
      this.notificationsClient.send({ cmd: 'send-email' }, options),
    );

    return result;
  }
}
