import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

@ValidatorConstraint({ name: 'CountryExist', async: true })
@Injectable()
export class CountryExist implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(countryIds: number[] | number) {
    try {
      if (typeof countryIds === 'number') {
        countryIds = [countryIds];
      }

      for (let i = 0; i < countryIds.length; i++) {
        if (typeof countryIds[i] != 'number') return false;

        const country = await this.prisma.country.findUnique({
          where: {
            id: countryIds[i],
          },
        });

        if (!country) return false;
      }

      return true;
    } catch (error) {
      console.log(error);

      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return `Country does not exist`;
  }
}
