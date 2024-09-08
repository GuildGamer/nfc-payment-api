import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionReferenceHelper {
  constructor(private config: ConfigService) {}

  async generate(transactionType: TransactionType): Promise<string> {
    try {
      const formattedTransactionType = transactionType.replace(/_/g, '-');
      return this.config.get('NODE_ENV') === 'prod' ||
        this.config.get('NODE_ENV') === 'live' ||
        this.config.get('NODE_ENV') === 'production'
        ? `stark-pay-${formattedTransactionType.toLowerCase()}-${Date.now()}`
        : `stark-pay-${this.config.get(
            'NODE_ENV',
          )}-${formattedTransactionType.toLowerCase()}-${Date.now()}`;
    } catch (error) {
      console.log(error);

      throw new Error('Failed to return safe user');
    }
  }
}
