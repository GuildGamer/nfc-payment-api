import { PaymentProcessor } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdatePaymentProcessorDto {
  @IsEnum(PaymentProcessor, {
    message: `Valid processor options are ${PaymentProcessor}`,
  })
  @IsNotEmpty()
  processor: PaymentProcessor;
}
