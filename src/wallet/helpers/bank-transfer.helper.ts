import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bank, TransactionType } from '@prisma/client';
import { TransactionReferenceHelper } from 'src/common/helpers';

@Injectable()
export class BankTranferHelper {
  logger = new Logger(BankTranferHelper.name);
  constructor(
    private config: ConfigService,
    private transactionRefHelper: TransactionReferenceHelper,
  ) {}

  Flutterwave = require('flutterwave-node-v3');
  flw = new this.Flutterwave(
    this.config.get('FLW_PUBLIC_KEY'),
    this.config.get('FLW_SECRET_KEY'),
  );

  async flutterwaveTransfer(
    amount: number,
    bank: Bank,
    bankAccountNumber: string,
    narration?: string,
  ): Promise<{ success: boolean; data: any }> {
    const tx_ref = await this.transactionRefHelper.generate(
      TransactionType.WITHDRAWAL,
    );
    try {
      //10 Naira + 7.5% VAT for Transactions up to N5,000.

      // 25 Naira + 7.5% VAT for Transactions from N5,001 to N50,000.

      // 50 Naira + 7.5% VAT for Transactions more than N50,001.

      // eslint-disable-next-line @typescript-eslint/no-var-requires

      let responseData = null;

      const details = {
        account_bank: bank.code,
        account_number: bankAccountNumber,
        amount,
        currency: 'NGN',
        narration,
        reference: tx_ref,
        debit_currency: 'NGN',
      };

      await this.flw.Transfer.initiate(details)
        .then(async (data: any) => {
          console.log('DATA', data);
          responseData = await data;
        })
        .catch((error: any) => {
          console.log('ERROR: ', error);
        });

      // console.log(responseData);

      // if (!responseData.status) {
      //   console.log('RESPONSE DATA', responseData);
      // }

      return {
        success: responseData?.status === 'success' ? true : false,
        data: responseData?.data,
      };
    } catch (error) {
      console.log('ERROR: ', error);

      return { success: false, data: { reference: tx_ref } };
    }
  }
}
