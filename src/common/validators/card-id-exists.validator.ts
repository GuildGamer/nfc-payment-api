import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

@ValidatorConstraint({ name: 'CardIdExist', async: true })
@Injectable()
export class CardIdExist implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(cardIds: number[] | number) {
    try {
      if (typeof cardIds === 'number') {
        cardIds = [cardIds];
      }

      for (let i = 0; i < cardIds.length; i++) {
        if (typeof cardIds[i] != 'number') return false;

        const card = await this.prisma.card.findUnique({
          where: {
            id: cardIds[i],
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
