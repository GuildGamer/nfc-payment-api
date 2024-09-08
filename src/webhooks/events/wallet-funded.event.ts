import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { mailGenerator } from 'src/email/mailgen/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { EmailBody } from 'src/email/types';
import { EmailService } from 'src/email/email.service';
import { Transaction } from '@prisma/client';
import { DateHelper } from 'src/common/helpers';

@Injectable()
export class WalletFundedEvent {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private pushNotificationService: PushNotificationService,
    private emailService: EmailService,
  ) {}

  emitEvent(
    amount: number,
    recipientId: string,
    transaction: Transaction,
    recipientBalance?: number,
  ): void {
    this.eventEmitter.emit(
      'wallet.funded',
      amount,
      recipientId,
      transaction,
      recipientBalance,
    );
  }

  @OnEvent('wallet.funded', { async: true })
  async handleWalletFundedEvent(
    amount: number,
    recipientId: string,
    transaction: Transaction,
    recipientBalance?: number,
  ) {
    try {
      const logger = new Logger('Event');
      const recipientTokens = await this.prisma.notificationToken.findMany({
        where: {
          userId: recipientId,
        },
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: recipientId,
        },
      });

      recipientTokens.forEach(async (token) => {
        await this.pushNotificationService.selectPushTokenTypeAndSend(
          token.notificationToken,
          'Wallet Funded!',
          `Your wallet has been successfully funded with ₦ ${amount}`,
          'transaction',
          recipientBalance.toString(),
        );
      });

      logger.log('Wallet Funded Push Notification sent');

      const email = {
        body: {
          name: `${user.username}`,
          intro: [
            `Your StarkPay wallet has been credited with ₦${amount}.`,
            `The details are shown below:`,
            `
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #f8f9fa; border-radius: 10px; margin: 20px 0;">
              <tbody style="border-radius: 10px;">
                  <tr>
                    <td style="padding: 12px; border-top: none; border-radius: 10px;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; float:left; width:50%;">Transaction ID:</div>
                        <div style="text-align: right; float:right; width:50%;"> ${
                          transaction.transactionReference
                        }</div>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; float:left; width:50%;">Date:</div>
                        <div style="text-align: right; float:right; width:50%;"> ${DateHelper.slashSeparated(
                          transaction.createdAt,
                        )}</div>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; float:left; width:50%;">Amount:</div>
                        <div style="text-align: right; float:right; width:50%;"> ₦${amount}</div>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <div style="font-weight: bold; float:left; width:50%;">Description:</div>
                        <div style="text-align: right;float:right; width:50%;;">${
                          transaction.narration ? transaction.narration : ' --'
                        }</div>
                      </div>
                    </td>
                  </tr>
              </tbody>
              </table>
              `,
          ],
        },
      };

      const emailBody = mailGenerator.generate(email);

      const mail: EmailBody = {
        to: user.email,
        subject: `Your StarkPay Wallet Has Been Funded With ₦${amount} 💸`,
        content: emailBody,
      };

      await this.emailService.sendEmail(mail);
    } catch (error) {
      console.log(error);
    }
  }
}
