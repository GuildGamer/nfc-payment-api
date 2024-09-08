import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { BankTranferHelper, CollectionAccountHelper } from './helpers';
import { ConfigService } from '@nestjs/config';
import { TransactionReferenceHelper } from 'src/common/helpers';
import { BusinessModule } from 'src/business/business.module';

@Module({
  imports: [BusinessModule],
  providers: [
    WalletService,
    CollectionAccountHelper,
    BankTranferHelper,
    ConfigService,
    TransactionReferenceHelper,
  ],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
