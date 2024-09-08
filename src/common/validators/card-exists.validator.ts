import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

@ValidatorConstraint({ name: 'CardExist', async: true })
@Injectable()
export class CardExist implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(nfcCardNumber: string[] | string) {
    try {
      if (typeof nfcCardNumber === 'string') {
        nfcCardNumber = [nfcCardNumber];
      }

      for (let i = 0; i < nfcCardNumber.length; i++) {
        if (typeof nfcCardNumber[i] != 'string') return false;

        const card = await this.prisma.card.findUnique({
          where: {
            nfcCardNumber: nfcCardNumber[i],
          },
        });

        if (!card) return false;
      }

      return true;
    } catch (error) {
      console.log(error);

      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return `Card does not exist`;
  }
}
