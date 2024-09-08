import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'GreaterThanZero', async: true })
@Injectable()
export class GreaterThanZero implements ValidatorConstraintInterface {
  async validate(amount: number) {
    try {
      return amount > 0;
    } catch (error) {
      console.log(error);

      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return `Amount cannot be zero or negative`;
  }
}
