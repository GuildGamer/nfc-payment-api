import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';
import { DiscordService } from 'src/discord/discord.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';

@Injectable()
export class WalletCreditedEvent {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private pushNotificationService: PushNotificationService,
    private discordService: DiscordService,
  ) {}

  emitEvent(
    amount: number,
    senderId: string,
    recipientId?: string,
    businessId?: string,
    senderBalance?: number,
    recipientBalance?: number,
  ): void {
    this.eventEmitter.emit(
      'wallet.credited',
      amount,
      senderId,
      recipientId,
      businessId,
      senderBalance,
      recipientBalance,
    );
  }

  @OnEvent('wallet.credited', { async: true })
  async handleWalletCreditedEvent(
    amount: number,
    senderId: string,
    recipientId?: string,
    businessId?: string,
    senderBalance?: number,
    recipientBalance?: number,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: senderId,
        },
        include: {
          notificationTokens: true,
        },
      });

      const { username, roles } = user;

      user.notificationTokens.forEach(async (token) => {
        await this.pushNotificationService.sendPushNotification(
          token.notificationToken,
          'Payment Successful!',
          `Your payment of NGN ${amount} to a merchant was successful`,
          'transaction',
          senderBalance.toString(),
        );
      });

      let recipientName: string;
      let recipientRoles: Role[];
      if (recipientId) {
        const recipient = await this.prisma.user.findUnique({
          where: {
            id: recipientId,
          },
          include: {
            notificationTokens: true,
          },
        });

        const { username, roles } = recipient;
        recipientName = username;
        recipientRoles = roles;

        recipient.notificationTokens.forEach(async (token) => {
          await this.pushNotificationService.sendPushNotification(
            token.notificationToken,
            'Wallet Credited!',
            `Your wallet was credited with NGN ${amount}`,
            'transaction',
            recipientBalance.toString(),
          );
        });
      } else if (businessId) {
        const business = await this.prisma.business.findUnique({
          where: {
            id: businessId,
          },
        });

        recipientName = business.name;
        recipientRoles = [Role.BUSINESS];
      }

      this.sendDiscordNotification(
        username,
        roles,
        recipientName,
        recipientRoles,
        amount,
      );
    } catch (error) {
      console.log(error);
    }
  }

  sendDiscordNotification(
    sender: string,
    senderRole: Role[],
    recipient: string,
    recipientRole: Role[],
    amount: number,
  ) {
    this.discordService.sendToDiscord({
      link: 'https://discord.com/api/webhooks/1144627772208205964/UC36Xkuo72UyhyLFWi0ybHG9r-RVs8iFn-yISXCKraiHVZeiMkBKXDE4lkHutdhRaZcg',
      author: `${sender}`,
      message: `₦${amount} was paid by ${sender} [${senderRole}] to ${recipient} [${recipientRole}]`,
      title: `₦${amount} Payment`,
    });
  }
}
