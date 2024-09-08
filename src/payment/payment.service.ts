import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto, SendPaymentDto } from './dto';
import { WalletService } from '../wallet/wallet.service';
import {
  Station,
  TransactionStatus,
  TransactionType,
  User,
  Wallet,
} from '@prisma/client';
import { UserService } from 'src/user/user.service';
import { CustomResponse, UserWithWallet } from 'src/common/types';
import * as argon from 'argon2';
import { TransactionReferenceHelper } from 'src/common/helpers';
import { WalletCreditedEvent } from './events';
// import { DiscordService } from 'src/discord/discord.service';
@Injectable()
export class PaymentService {
  logger = new Logger(PaymentService.name);
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private userService: UserService,
    private transactionRefHelper: TransactionReferenceHelper,
    private walletCreditedEvent: WalletCreditedEvent,
  ) {}

  async collectPayment(
    entity: Station & User,
    createPaymentDto: CreatePaymentDto,
  ): Promise<CustomResponse> {
    try {
      const { cardId, privateKey } = createPaymentDto;
      const { id, businessId, dailyBalance } = entity;
      let { amount } = createPaymentDto;
      let wallet: Wallet;

      // According to CBN contactless payment guidelines
      if (amount > 15000) {
        throw new ForbiddenException({
          success: false,
          msg: 'Sorry, you cannot send more than ₦15,000 at a time.',
          data: null,
        });
      }

      if (dailyBalance !== undefined) {
        //handle for if collection is by station
        const station = await this.prisma.station.findUnique({
          where: {
            id,
          },
          include: {
            business: {
              include: {
                wallets: true,
              },
            },
          },
        });

        wallet = station.business.wallets[0];

        if (station.amountIsFixed) {
          amount = station.amount;
        }
      } else {
        // handle if collection is by merchant
        wallet = await this.prisma.wallet.findFirst({
          where: { userId: id },
        });
      }

      if (!wallet) {
        return {
          success: false,
          msg: 'Wallet not found',
          data: null,
        };
      }

      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        include: { wallet: true, user: true },
      });

      if (!card || !card.userId) {
        throw new NotFoundException({
          success: false,
          msg: 'Card not found',
          data: null,
        });
      }

      if (!card.active) {
        throw new NotFoundException({
          success: false,
          msg: 'Card is inactive',
          data: null,
        });
      }

      const cardSecretMatches = await argon.verify(card.hash, privateKey);

      if (!cardSecretMatches) {
        throw new ForbiddenException({
          success: false,
          msg: 'private key is invalid',
          data: null,
        });
      }

      if (createPaymentDto.amount > 500) {
        const passMatches = await argon.verify(
          card.user.hash,
          createPaymentDto.password,
        );

        if (!passMatches) {
          throw new ForbiddenException({
            success: false,
            msg: 'Incorrect password',
            data: null,
          });
        }
      }

      let availableBalance: number;
      // return card.balance;
      if (card.balance !== null) {
        availableBalance = card.balance;
      } else {
        availableBalance = card.wallet.balance;
      }

      if (availableBalance < amount) {
        throw new NotFoundException({
          success: false,
          msg: 'Insufficient balance',
          data: null,
        });
      }

      const userWallet: Wallet = card.wallet;

      if (card.balance !== null) {
        // if the card has a balance. Meaning the card was funded and is restricted to use said amount.
        await this.prisma.$transaction([
          this.prisma.card.update({
            where: { id: card.id },
            data: { balance: { decrement: amount } },
          }),
          this.prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: amount } },
          }),
        ]);
      } else {
        let totalTransactionAmountToday =
          userWallet.totalTransactionAmountToday;

        // resets daily transaction amount if it is a new day
        if (
          new Date(userWallet.latestTransactionTimestamp).setHours(
            0,
            0,
            0,
            0,
          ) !== new Date().setHours(0, 0, 0, 0)
        ) {
          totalTransactionAmountToday = 0;
        }

        // Checks if the user has exceeded daily transaction limit
        if (totalTransactionAmountToday + amount > 50000) {
          throw new ForbiddenException({
            success: false,
            msg:
              'Daily transaction limit reached. You cannot spend more than ₦' +
              (50000 - totalTransactionAmountToday).toFixed(2) +
              ' For the rest of the day',
            data: null,
          });
        }
        // Deduct from user wallet balance and add to driver wallet
        await this.prisma.$transaction([
          this.prisma.wallet.update({
            where: { id: userWallet.id },
            data: {
              balance: { decrement: amount },
              latestTransactionTimestamp: new Date(),
              totalTransactionAmountToday: totalTransactionAmountToday + amount,
            },
          }),
          this.prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: amount } },
          }),
          this.prisma.station.update({
            where: { id },
            data: { dailyBalance: { increment: amount } },
          }),
        ]);
      }

      const trxRef = await this.transactionRefHelper.generate(
        TransactionType.PAYMENT,
      );

      const transaction = await this.prisma.transaction.create({
        data: {
          transactionReference: trxRef,
          walletId: userWallet.id,
          cardId: card.id,
          type: TransactionType.PAYMENT,
          amount: amount,
          status: TransactionStatus.SUCCESSFUL,
          recipientId: wallet.userId,
          businessId: businessId,
          stationId: id,
          createdById: card.userId,
        },
      });

      this.walletCreditedEvent.emitEvent(
        amount,
        userWallet.userId,
        wallet.userId,
        businessId,
        userWallet.balance,
        wallet.balance,
      );

      return <CustomResponse>{
        success: true,
        msg: 'Payment Successful',
        data: { transaction },
      };
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Payment failed',
        data: null,
      });
    }
  }

  async sendPayment(
    user: UserWithWallet,
    dto: SendPaymentDto,
  ): Promise<CustomResponse> {
    try {
      const { recipientUniqueIdentifier, amount } = dto;

      // Verify the recipient
      const { data }: any = await this.userService.getUserByUniqueIdentifier(
        recipientUniqueIdentifier,
      );

      const recipient = data;

      if (!recipient) {
        return {
          success: false,
          msg: 'Recipient not found',
          data: null,
        };
      }

      // Get the recipient's wallet
      const recipientWallet = await recipient.wallets[0];
      if (!recipientWallet) {
        return {
          success: false,
          msg: 'Recipient wallet not found',
          data: null,
        };
      }

      const senderWallet = user.wallets[0];

      // Check if the sender's wallet has enough balance
      if (senderWallet.balance < amount) {
        return {
          success: false,
          msg: 'Insufficient balance',
          data: null,
        };
      }

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: senderWallet.id },
          data: {
            balance: { decrement: amount },
          },
        }),
        this.prisma.wallet.update({
          where: { id: recipientWallet.id },
          data: {
            balance: { increment: amount },
          },
        }),
      ]);

      const trxRef = await this.transactionRefHelper.generate(
        TransactionType.TRANSFER,
      );

      // Record the transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          transactionReference: trxRef,
          walletId: senderWallet.id,
          type: TransactionType.TRANSFER,
          amount: amount,
          status: TransactionStatus.SUCCESSFUL,
          recipientId: recipientWallet.userId,
          createdById: senderWallet.userId,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Successfully sent payment',
        data: { transaction },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send payment from [${user.username}] to [${dto.recipientUniqueIdentifier}]`,
      );
      console.log(error);

      return {
        success: false,
        msg: 'Failed to send payment',
        data: null,
      };
    }
  }
}
