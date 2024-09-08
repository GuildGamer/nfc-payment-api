/* eslint-disable @typescript-eslint/no-var-requires */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionType } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
const flutterwave = require('flutterwave-node-v3');

@Injectable()
export class CollectionAccountHelper {
  logger = new Logger(CollectionAccountHelper.name);

  constructor(private config: ConfigService) {
    // console.log(`FLW_SEC_KEY`, this.config.get('FLW_SECRET_KEY'));
    // console.log(`FLW_PUBLIC_KEY`, this.config.get('FLW_PUBLIC_KEY'));
  }

  flw = new flutterwave(
    this.config.get('FLW_PUBLIC_KEY'),
    this.config.get('FLW_SECRET_KEY'),
  );

  async createWithBloc(
    name: string,
    username: string,
    frequency: number,
    amount: number,
  ): Promise<{ success: boolean; data: any }> {
    try {
      const requestUrl = `${this.config.get(
          'BLOC_API_BASE_URL',
        )}/accounts/collections`,
        authorization = `Bearer ${await this.config.get('BLOC_KEY')}`;

      const headers = {
        authorization,
        'content-type': 'application/json',
      };

      const data = {
        alias: `${name} ${username}`,
        preferred_bank: 'Zenith',
        collection_rules: {
          frequency,
          amount,
        },
      };

      const response = await axios.get(requestUrl, {
        headers,
        data,
      });

      if (!response.data?.success) {
        console.log('ERROR', response.data?.message);

        return {
          success: false,
          data: null,
        };
      }

      console.log(response.data);

      const collectionAccount = response.data?.data;

      return {
        success: true,
        data: collectionAccount,
      };
    } catch (error) {
      console.log(error);

      return {
        success: false,
        data: null,
      };
    }
  }

  async createWithFlw(
    email: string,
    name: string,
    amount: number,
    frequency: number,
    reference: string,
  ): Promise<{ success: boolean; data: any }> {
    try {
      let responseData = null;

      const details = {
        email,
        amount,
        frequency: frequency.toString(),
        narration: `${name} (StarkPay)`,
        tx_ref: reference,
        is_permanent: false,
      };

      await this.flw.VirtualAcct.create(details)
        .then((data: any) => {
          responseData = data;
        })
        .catch(console.log);

      if (responseData?.status !== 'success') {
        console.log(responseData);
      }

      return {
        success: responseData.status
          ? responseData?.status === 'success'
          : false,
        data: responseData?.data,
      };
    } catch (error) {
      console.log(error);

      return {
        success: false,
        data: null,
      };
    }
  }

  async getTransaction(id: string): Promise<any> {
    try {
      this.logger.log('Getting transaction with id ' + id);
      const transaction = await this.flw.Transaction.verify({
        id: id.toString(),
      });
      console.log('TRANSACTION', transaction);
      return transaction;
    } catch (error) {
      this.logger.error(
        'Error getting transaction with id ' + id,
        JSON.stringify(error, null, 2),
      );
    }
  }

  async verifyTransaction(
    id: string,
    expectedAmount: number,
  ): Promise<boolean> {
    try {
      this.logger.log('Verifying transaction with id ' + id);
      const transaction = await this.getTransaction(id.toString());

      if (
        transaction.data.status === 'successful' &&
        transaction.data.amount === expectedAmount
      ) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      this.logger.error(
        'Error verifying transaction with id ' + id,
        JSON.stringify(error, null, 2),
      );
    }
  }
}
