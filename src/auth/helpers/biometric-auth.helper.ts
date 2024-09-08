import { Injectable } from '@nestjs/common';
import { JwtHelper } from './jwt.helper';
import * as argon from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BiometricAuthHelper {
  constructor(private jwtHelper: JwtHelper, private prisma: PrismaService) {}

  async generateDeviceId(userId: string): Promise<string> {
    const deviceId = uuidv4();

    const biometricSecret = await argon.hash(deviceId);

    try {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          biometricSecret: biometricSecret,
        },
      });

      return deviceId;
    } catch (error) {
      console.log(error);

      throw new Error('Failed to save biometric secret');
    }
  }
}
