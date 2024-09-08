import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [TransactionService, ConfigService],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule {}
