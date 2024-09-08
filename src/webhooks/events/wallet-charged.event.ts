import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Transaction } from '@prisma/client';
import { DateHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { PushNotificationService } from 'src/push-notification/push-notification.service';

@Injectable()
export class WalletChargedEvent {
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
      'wallet.charged',
      amount,
      recipientId,
      transaction,
      recipientBalance,
    );
  }
  emitFailedEvent(
    amount: number,
    recipientId: string,
    transaction: Transaction,
    recipientBalance?: number,
  ): void {
    this.eventEmitter.emit(
      'charge.failed',
      amount,
      recipientId,
      transaction,
      recipientBalance,
    );
  }

  @OnEvent('wallet.charged', { async: true })
  async handleWalletChargedEvent(
    amount: number,
    recipientId: string,
    transaction: Transaction,
    recipientBalance?: number,
  ) {
    try {
      const { transactionReference, createdAt, narration, fee } = transaction;
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
          'Withdrawal Successful!',
          `Your withdrawal of NGN ${amount} was successful`,
          'transaction',
          recipientBalance.toString(),
        );
      });

      const email = {
        body: {
          name: `${user.username}`,
          intro: [
            `Your withdrawal of ₦${amount} from your StarkPay wallet is successful.`,
            `The details are shown below:`,
            `
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: #f8f9fa; border-radius: 10px; margin: 20px 0;">
              <tbody style="border-radius: 10px;">
                  <tr>
                    <td style="padding: 12px; border-top: none; border-radius: 10px;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; float:left; width:50%;">Transaction ID:</div>
                        <div style="text-align: right; float:right; width:50%;"> ${transactionReference}</div>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; float:left; width:50%;">Date:</div>
                        <div style="text-align: right; float:right; width:50%;"> ${DateHelper.slashSeparated(
                          createdAt,
                        )}</div>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; float:left; width:50%;">Amount:</div>
                        <div style="text-align: right; float:right; width:50%;"> ₦${amount}</div>
                      </div>
                       <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; float:left; width:50%;">Fee:</div>
                        <div style="text-align: right; float:right; width:50%;"> ₦${fee}</div>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <div style="font-weight: bold; float:left; width:50%;">Description:</div>
                        <div style="text-align: right;float:right; width:50%;;">${
                          narration ? narration : ' --'
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
        subject: `Your Withdrawal of ₦${amount} Is Successful 💸`,
        content: emailBody,
      };

      await this.emailService.sendEmail(mail);

      logger.log('Wallet debited(withdrawal');
    } catch (error) {
      console.log(error);
    }
  }

  @OnEvent('charge.failed', { async: true })
  async handleFailedChargeEvent(
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
          'Withdrawal Failed',
          `Your withdrawal of NGN ${amount} failed`,
          'transaction',
          recipientBalance.toString(),
        );
      });

      const email = {
        body: {
          name: `${user.username}`,
          intro: [
            `Your withdrawal of ₦${amount} from your StarkPay wallet failed.`,
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
        subject: `Your Withdrawal of ₦${amount} Failed ❌`,
        content: emailBody,
      };

      await this.emailService.sendEmail(mail);

      logger.log('Wallet debited(withdrawal');
    } catch (error) {
      console.log(error);
    }
  }
}
