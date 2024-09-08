import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

@ValidatorConstraint({ name: 'BankExist', async: true })
@Injectable()
export class BankExist implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}
  async validate(banksSlugs: string[] | string) {
    try {
      if (typeof banksSlugs === 'string') {
        banksSlugs = [banksSlugs];
      }

      for (let i = 0; i < banksSlugs.length; i++) {
        if (typeof banksSlugs[i] != 'string') return false;

        const Bank = await this.prisma.bank.findUnique({
          where: {
            slug: banksSlugs[i],
          },
        });

        if (!Bank) return false;
      }

      return true;
    } catch (error) {
      console.log(error);

      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return `Bank does not exist`;
  }
}
