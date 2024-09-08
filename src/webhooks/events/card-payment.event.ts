import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { UserWithWallet } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CardPaymentEvent {
  logger = new Logger('');

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  emitEvent(data: any, user: UserWithWallet): void {
    this.eventEmitter.emit('charge.success', data, user);
  }

  @OnEvent('charge.success', { async: true })
  async handleCardPaymentEvent(data: any, user: UserWithWallet) {
    try {
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: {
            id: user.wallets[0].id,
          },
          data: {
            balance: { increment: data.data.amount / 100 },
          },
        }),
        this.prisma.transaction.create({
          data: {
            status: TransactionStatus.SUCCESSFUL,
            transactionReference: data.data.reference,
            type: TransactionType.FUND_WALLET,
            amount: data.data.amount / 100,
            recipientId: user.id,
            walletId: user.wallets[0].id,
          },
        }),
      ]);

      this.logger.log('Wallet Funded with Card Payment');
    } catch (error) {
      console.log(error);
    }
  }
}
