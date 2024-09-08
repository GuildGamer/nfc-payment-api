import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

@ValidatorConstraint({ name: 'WalletExist', async: true })
@Injectable()
export class WalletExist implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(walletIds: string[] | string) {
    try {
      if (typeof walletIds === 'string') {
        walletIds = [walletIds];
      }

      for (let i = 0; i < walletIds.length; i++) {
        if (typeof walletIds[i] != 'string') return false;

        const wallet = await this.prisma.wallet.findUnique({
          where: {
            id: walletIds[i],
          },
        });

        if (!wallet) return false;
      }

      return true;
    } catch (error) {
      console.log(error);

      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return `Wallet does not exist`;
  }
}
