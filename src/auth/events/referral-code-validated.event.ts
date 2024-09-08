import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { TransactionReferenceHelper } from 'src/common/helpers';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReferralCodeValidatedEvent {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private transactionRefHelper: TransactionReferenceHelper,
  ) {}

  emitEvent(data: { referralCode: string; userId: string }): void {
    this.eventEmitter.emit('referralCode.validated', data);
  }

  @OnEvent('referralCode.validated', { async: true })
  async handleReferralCodeValidatedEvent(data: {
    referralCode: string;
    userId: string;
  }) {
    try {
      const configuration = await this.prisma.configuration.findUnique({
        where: {
          id: 1,
        },
      });

      const referrer = await this.prisma.user.findUnique({
        where: {
          username: data.referralCode,
        },
        include: {
          wallets: true,
        },
      });

      if (referrer?.id !== data.userId) {
        await this.prisma.wallet.update({
          where: {
            id: referrer.wallets[0].id,
          },
          data: {
            balance: { increment: configuration.creditsPerReferral },
          },
        });

        const trx_ref = await this.transactionRefHelper.generate(
          TransactionType.REFERRAL_BONUS,
        );

        await this.prisma.transaction.create({
          data: {
            transactionReference: trx_ref,
            type: TransactionType.REFERRAL_BONUS,
            amount: configuration.creditsPerReferral,
            status: TransactionStatus.SUCCESSFUL,
            recipientId: referrer.id,
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
}
