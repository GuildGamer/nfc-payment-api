import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BankTransferEvent, WalletChargedEvent } from './events';
import { CollectionAccountHelper } from 'src/wallet/helpers';
import {
  PaymentProcessor,
  TransactionStatus,
  WebhookSource,
} from '@prisma/client';

@Injectable()
export class WebhooksService {
  logger = new Logger(WebhooksService.name);
  constructor(
    private prisma: PrismaService,
    private bankTransferEvent: BankTransferEvent,
    private walletChargedEvent: WalletChargedEvent,
    private collectionAccountHelper: CollectionAccountHelper,
  ) {}

  async flutterWaveWebhook(payload: any) {
    try {
      // Save the webhook data
      await this.prisma.webhooks.create({
        data: {
          data: payload,
          source: WebhookSource.FLUTTERWAVE,
        },
      });

      const { event } = payload;
      const { id, amount, status, customer, trx_ref, reference, fee } =
        payload.data;
      const eventType = payload['event.type'];

      this.logger.log(
        'FLUTTERWAVE WEBHOOK DATA: ',
        JSON.stringify(payload, null, 2),
      );

      switch (eventType) {
        case 'BANK_TRANSFER_TRANSACTION':
          const user = await this.prisma.user.findUnique({
            where: {
              email: customer.email,
            },
            include: {
              wallets: true,
            },
          });

          const existingTransaction = await this.prisma.transaction.findUnique({
            where: {
              transactionReference: trx_ref,
            },
          });

          const transactionVerified =
            await this.collectionAccountHelper.verifyTransaction(id, amount);

          if (transactionVerified) {
            if (event === 'charge.completed' && status === 'successful') {
              this.logger.log('Bank transfer charge completed');

              if (
                existingTransaction &&
                status !== existingTransaction.processorStatus
              ) {
                this.bankTransferEvent.emitEvent(
                  status,
                  amount,
                  trx_ref,
                  id,
                  user,
                  PaymentProcessor.FLUTTERWAVE,
                  existingTransaction?.id,
                );
              } else {
                this.bankTransferEvent.emitEvent(
                  status,
                  amount,
                  trx_ref,
                  id,
                  user,
                  PaymentProcessor.FLUTTERWAVE,
                );
              }
            } else {
              this.logger.log('Bank Transfer charge failed...');

              this.bankTransferEvent.emitFailedEvent(
                status,
                amount,
                trx_ref,
                id,
                user,
                PaymentProcessor.FLUTTERWAVE,
                existingTransaction.id,
              );
            }
          } else {
            this.logger.log('Failed to verify transaction with id ' + id);
          }
          break;

        case 'Transfer':
          if (event === 'transfer.completed') {
            this.logger.log('Bank Transfer charge completed...');
            const { wallet, walletId, amount, id, createdById } =
              await this.prisma.transaction.findUnique({
                where: {
                  transactionReference: reference,
                },
                include: {
                  wallet: true,
                },
              });

            if (status === 'SUCCESSFUL') {
              const transaction = (
                await this.prisma.$transaction([
                  this.prisma.wallet.update({
                    where: {
                      id: walletId,
                    },
                    data: {
                      balance: { decrement: fee },
                    },
                  }),
                  this.prisma.transaction.update({
                    where: {
                      id,
                    },
                    data: {
                      fee,
                      status: TransactionStatus.SUCCESSFUL,
                    },
                  }),
                ])
              )[1];

              this.walletChargedEvent.emitEvent(
                amount,
                createdById,
                transaction,
                wallet.balance,
              );
            } else if (status === 'FAILED') {
              const transaction = (
                await this.prisma.$transaction([
                  this.prisma.wallet.update({
                    where: {
                      id: walletId,
                    },
                    data: {
                      balance: { increment: amount },
                    },
                  }),
                  this.prisma.transaction.update({
                    where: {
                      id,
                    },
                    data: {
                      status: TransactionStatus.FAILED,
                    },
                  }),
                ])
              )[1];

              this.walletChargedEvent.emitFailedEvent(
                amount,
                createdById,
                transaction,
                wallet.balance,
              );
            }
          } else {
            this.logger.log('Bank Transfer charge incomplete');
          }
        default:
          this.logger.log('----UNHANDLED FLUTTERWAVE WEBHOOK EVENT---');
      }
    } catch (error) {
      this.logger.error('Error parsing Flutterwave webhook');

      console.log(error);
    }
  }

  async payStackWebhook(data: any) {
    try {
      // Save the webhook data
      await this.prisma.webhooks.create({
        data: {
          data,
          source: WebhookSource.PAYSTACK,
        },
      });

      const { reference, customer, status, id } = data.data;
      let { amount } = data.data;
      amount = amount / 100;

      if (data.event === 'charge.success') {
        const user = await this.prisma.user.findUnique({
          where: {
            email: customer.email,
          },
          include: {
            wallets: true,
          },
        });

        const existingTransaction = await this.prisma.transaction.findUnique({
          where: {
            transactionReference: reference,
          },
        });

        if (
          existingTransaction &&
          status !== existingTransaction.processorStatus
        ) {
          this.bankTransferEvent.emitEvent(
            status,
            amount,
            reference,
            id,
            user,
            PaymentProcessor.PAYSTACK,
            existingTransaction.id,
          );
        } else {
          this.bankTransferEvent.emitEvent(
            status,
            amount,
            reference,
            id,
            user,
            PaymentProcessor.PAYSTACK,
          );
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
}
