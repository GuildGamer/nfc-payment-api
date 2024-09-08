import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { OTPEnum, verifyOtpResponse } from '../types';

@Injectable()
export class OtpHelper {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private async generateUniqueOtp(
    use: OTPEnum,
    identifier: string,
  ): Promise<string> {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 6; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }

    const expiration = new Date();
    expiration.setMinutes(
      expiration.getMinutes() +
        parseInt(this.config.get('OTP_EXPIRATION_IN_MINUTES')),
    );

    OTP = OTP + '-' + expiration + '-' + use + '-' + identifier;

    return OTP;
  }

  async generateOtp(
    userId: string,
    use: OTPEnum,
    identifier: string,
  ): Promise<string> {
    let OTP = await this.generateUniqueOtp(use, identifier);

    let usersWithOtp = await this.prisma.user.findMany({
      where: {
        otp: {
          startsWith: OTP,
        },
      },
    });

    while (usersWithOtp.length > 0) {
      OTP = await this.generateUniqueOtp(use, identifier);

      usersWithOtp = await this.prisma.user.findMany({
        where: {
          otp: {
            startsWith: OTP,
          },
        },
      });
    }

    try {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          otp: OTP,
        },
      });

      return OTP.split('-')[0];
    } catch (error) {
      console.log(error);
    }
  }

  async verifyOtp(
    OTP: string,
    use: OTPEnum,
    identifier?: string,
    user?: User,
  ): Promise<verifyOtpResponse> {
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          otp: {
            startsWith: OTP,
          },
        },
      });
    }

    if (!user || user.otp.split('-')[2] !== use) {
      return <verifyOtpResponse>{
        valid: false,
        msg: 'This OTP is invalid.',
        user: null,
      };
    }

    if (identifier && user.otp.split('-')[3] !== identifier) {
      console.log('wrong identifier');

      return <verifyOtpResponse>{
        valid: false,
        msg: 'This OTP is invalid.',
        user: null,
      };
    }

    const now = new Date();
    const expiration = new Date(user.otp.split('-')[1]);

    if (now > expiration) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          otp: '',
        },
      });

      return <verifyOtpResponse>{
        valid: false,
        msg: 'This OTP has expired.',
        user: null,
      };
    }

    if (user.otp.split('-')[0] === OTP) {
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          otp: null,
        },
      });

      return <verifyOtpResponse>{
        valid: true,
        msg: 'OTP verified',
        user: user,
      };
    } else {
      console.log('wrong otp');

      return <verifyOtpResponse>{
        valid: false,
        msg: 'This OTP is invalid.',
        user: null,
      };
    }
  }
}
