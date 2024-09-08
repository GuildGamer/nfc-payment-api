import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  PaymentProcessor,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { UserWithWallet } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletFundedEvent } from './wallet-funded.event';

@Injectable()
export class BankTransferEvent {
  logger = new Logger(BankTransferEvent.name);
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private walletFundedEvent: WalletFundedEvent,
  ) {}

  emitEvent(
    status: string,
    amount: number,
    reference: string,
    id: number,
    user: UserWithWallet,
    processor: PaymentProcessor,
    transactionId?: string,
  ): void {
    this.eventEmitter.emit(
      'charge.completed',
      status,
      amount,
      reference,
      id,
      user,
      processor,
      transactionId,
    );
  }

  emitFailedEvent(
    status: string,
    amount: number,
    reference: string,
    id: number,
    user: UserWithWallet,
    processor: PaymentProcessor,
    transactionId?: string,
  ): void {
    this.eventEmitter.emit(
      'charge.failed',
      status,
      amount,
      reference,
      id,
      user,
      processor,
      transactionId,
    );
  }

  @OnEvent('charge.completed', { async: true })
  async handleChargeCompletedEvent(
    status: string,
    amount: number,
    reference: string,
    id: number,
    user: UserWithWallet,
    processor: PaymentProcessor,
    transactionId?: string,
  ) {
    try {
      if (transactionId) {
        this.logger.log('Updating Transaction...');
        await this.prisma.$transaction([
          this.prisma.transaction.update({
            where: {
              id: transactionId,
            },
            data: {
              status: TransactionStatus.SUCCESSFUL,
              processorStatus: status,
            },
          }),
          this.prisma.wallet.update({
            where: {
              id: user.wallets[0].id,
            },
            data: {
              balance: { increment: amount },
            },
          }),
        ]);

        const transaction = await this.prisma.transaction.findUnique({
          where: {
            id: transactionId,
          },
        });

        this.walletFundedEvent.emitEvent(
          amount,
          user.id,
          transaction,
          user.wallets[0].balance,
        );

        this.logger.log('Wallet Funded with Bank Tranfer');
      } else {
        this.logger.log('Creating Transaction...');
        const trx = await this.prisma.$transaction([
          this.prisma.wallet.update({
            where: {
              id: user.wallets[0].id,
            },
            data: {
              balance: { increment: amount },
            },
          }),
          this.prisma.transaction.create({
            data: {
              status: TransactionStatus.SUCCESSFUL,
              transactionReference: reference,
              processor,
              processorStatus: status,
              processorTrxId: id.toString(),
              type: TransactionType.FUND_WALLET,
              amount: amount,
              recipientId: user.id,
              walletId: user.wallets[0].id,
            },
          }),
        ]);

        // console.log(`TRX[1]`, trx[1]);

        this.walletFundedEvent.emitEvent(
          amount,
          user.id,
          trx[1],
          user.wallets[0].balance,
        );

        this.logger.log('Wallet Funded with Bank Tranfer');
      }
    } catch (error) {
      this.logger.error(
        'Error while saving transaction',
        JSON.stringify(error, null, 2),
      );
    }
  }

  @OnEvent('charge.failed', { async: true })
  async handleFailedEvent(
    status: string,
    amount: number,
    reference: string,
    id: number,
    user: UserWithWallet,
    processor: PaymentProcessor,
    transactionId?: string,
  ) {
    try {
      this.logger.error('Wallet Funding with Bank Transfer Failed');
      if (transactionId) {
        this.prisma.transaction.update({
          where: {
            id: transactionId,
          },
          data: {
            status: TransactionStatus.FAILED,
            processorStatus: status,
            processorTrxId: id.toString(),
          },
        });
      } else {
        this.prisma.transaction.create({
          data: {
            status: TransactionStatus.FAILED,
            transactionReference: reference,
            type: TransactionType.FUND_WALLET,
            processor,
            processorStatus: status,
            processorTrxId: id.toString(),
            amount: amount,
            recipientId: user.id,
            walletId: user.wallets[0].id,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        'Error while saving transaction',
        JSON.stringify(error, null, 2),
      );
    }
  }
}
