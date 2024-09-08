import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { DateHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';

@Injectable()
export class SendCardEmailHelper {
  constructor(private readonly emailService: EmailService) {}

  async sendCardConnectionEmail(emailTo: User, cardNumber: string) {
    const dateTime = DateHelper.slashSeparated();
    const name = emailTo.firstName
      ? emailTo.firstName.charAt(0).toUpperCase() + emailTo.firstName.slice(1)
      : emailTo.username.charAt(0).toUpperCase() + emailTo.username.slice(1);
    const email = {
      body: {
        name,
        intro: [
          `A StarkPay card with the number <b>${cardNumber}</b> was added to your account at ${dateTime}.`,
          `If you did not add this card to your StarkPay account, please reach out to support IMMEDIATELY.`,
          `You can send an email to <a href="mailto:support@starkpay.africa">support@starkpay.africa</a>.`,
          `Or call us at <a href="tel:+2348161821436">+234 816 182 1436</a>, <a href="tel:+2348087574177">+234 808 757 4177</a> or <a href="tel:+2348160477103">+234 816 047 7103</a>.`,
        ],
        outro: 'Thank you for using StarkPay.',
      },
    };

    const emailBody = mailGenerator.generate(email);

    const mail: EmailBody = {
      to: emailTo.email,
      subject: `Card Added 💳`,
      content: emailBody,
    };

    await this.emailService.sendEmail(mail);
  }

  async sendCardDisconnectionEmail(emailTo: User, cardNumber: string) {
    const dateTime = DateHelper.slashSeparated();
    const name = emailTo.firstName
      ? emailTo.firstName.charAt(0).toUpperCase() + emailTo.firstName.slice(1)
      : emailTo.username.charAt(0).toUpperCase() + emailTo.username.slice(1);
    const email = {
      body: {
        name,
        intro: [
          `A StarkPay card with the number <b>${cardNumber}</b> was removed from your account at ${dateTime}.`,
          `If you did not remove this card from your StarkPay account, please reach out to support IMMEDIATELY.`,
          `You can send an email to <a href="mailto:support@starkpay.africa">support@starkpay.africa</a>.`,
          `Or call us at <a href="tel:+2348161821436">+234 816 182 1436</a>, <a href="tel:+2348087574177">+234 808 757 4177</a> or <a href="tel:+2348160477103">+234 816 047 7103</a>.`,
        ],
        outro: 'Thank you for using StarkPay.',
      },
    };

    const emailBody = mailGenerator.generate(email);

    const mail: EmailBody = {
      to: emailTo.email,
      subject: `Card Removed 💳`,
      content: emailBody,
    };

    await this.emailService.sendEmail(mail);
  }
}
