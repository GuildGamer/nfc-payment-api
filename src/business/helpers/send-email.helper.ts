import { Injectable } from '@nestjs/common';
import { User, waiters } from '@prisma/client';
import { DateHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';

@Injectable()
export class SendEmailHelper {
  constructor(private readonly emailService: EmailService) {}

  async sendLoginConfirmationEmail(emailTo: User) {
    const dateTime = DateHelper.slashSeparated();
    const email = {
      body: {
        name: `${
          emailTo.username.charAt(0).toUpperCase() + emailTo.username.slice(1)
        }`,
        intro: [
          `This is to inform you that your StarkPay account was accessed at <b>${dateTime}</b>.`,
          `If you did not login to your StarkPay app at the time specified above, please reach out to support IMMEDIATELY.`,
          `You can send an email to <a href="mailto:support@starkpay.africa">support@starkpay.africa</a>.`,
          `Or call us at <a href="tel:+2348161821436">+234 816 182 1436</a>, <a href="tel:+2348087574177">+234 808 757 4177</a> or <a href="tel:+2348160477103">+234 816 047 7103</a>.`,
        ],
        outro: 'Thank you for using StarkPay.',
      },
    };

    const emailBody = mailGenerator.generate(email);

    const mail: EmailBody = {
      to: emailTo.email,
      subject: `StarkPay Login Confirmation (${dateTime}) ℹ️`,
      content: emailBody,
    };

    await this.emailService.sendEmail(mail);
  }

  async sendVerificationEmail(
    emailTo: User,
    OTP: string,
    emailAddress?: string,
  ) {
    const email = {
      body: {
        name: `${emailTo.firstName + ' ' + emailTo.lastName}`,
        intro: [
          `Please use the otp to verify your email: <h1 style="color:black"><b>${OTP}</b></h1>`,
        ],
        outro:
          "Need help, or have questions? Just reply to this email, we'd love to help.",
      },
    };

    const emailBody = mailGenerator.generate(email);

    const mail: EmailBody = {
      to: emailAddress ? emailAddress : emailTo.email,
      subject: 'StarkPay Email Verification',
      content: emailBody,
    };

    await this.emailService.sendEmail(mail);
  }

  async send2FAInstructionsEmail(
    emailTo: User,
    qrCode: string,
    url: string,
    base32: string,
  ) {
    const email = {
      body: {
        title: 'How To Set Up 2FA',
        name: `Hi, ${emailTo.firstName + ' ' + emailTo.lastName}`,
        intro: [
          'In order for you to complete your login, you have to first set up Two Factor Authentication with an authenticator app.',
          `First, download any auth app of your choice into your phone. Some options are:`,
          `- <a href="https://duo.com/product/multi-factor-authentication-mfa/duo-mobile-app#download"><b>Duo</b></a>`,
          `- Google Authenticator on <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en&gl=US"><b>Android</b></a> or <a href="https://apps.apple.com/us/app/google-authenticator/id388497605"><b>IOS</b></a>`,
          '<p>Open your authenticator app and scan the image below: </p>',
          `<img src="cid:1" alt="QR code for 2fa" />`,
          `<p>Or copy the code below and paste it in the app:</p>`,
          `<a href="${url}"><b>${base32}</b></a>`,
          '<p>Finally, copy the code you get from the app and paste in the field provided on the login screen.</p>',
        ],
        outro:
          "Need help, or have questions? Just reply to this email, we'd love to help.",
      },
    };

    const emailBody = mailGenerator.generate(email);

    const mail: EmailBody = {
      to: emailTo.email,
      subject: 'StarkPay Two Factor Authentication',
      content: emailBody,
    };

    const attachments = [
      {
        filename: 'qrCode.png',
        content: qrCode.split('base64,')[1],
        encoding: 'base64',
        cid: '1',
      },
    ];

    await this.emailService.sendEmail(mail, attachments);
  }

  async sendWelcomeEmailForWaiters(emailTo: waiters) {
    const email = {
      body: {
        title: 'Welcome to StarkPay!',
        name: `Hi, ${emailTo.fullName}`,
        intro: [
          "Welcome to StarkPay's Waitlist - Your Journey Begins Here!",
          `We are thrilled to have you onboard as a valued member of StarkPay's waitlist🚀.`,
          `We believe you've made an excellent choice, and we're excited to have you on board for this exciting journey. As we gear up to revolutionize and simplify how you pay for your trips, we can't wait to share all the incredible updates and developments with you.`,
          `Rest assured, your email address is in safe hands. We respect your privacy and will only use your email to send you relevant and valuable updates about StarkPay.`,
          `Once again, welcome to StarkPay's waitlist family! `,
          `Let's embark on this journey together, simplifying the way we make microtransactions. Thank you for joining us on this exciting ride!`,
        ],
        outro:
          'Feel free to respond to this email with any questions you might have.',
      },
    };

    const emailBody = mailGenerator.generate(email);

    const mail: EmailBody = {
      to: emailTo.email,
      subject: `Welcome to StarkPay's Waitlist - Your Journey Begins Here!`,
      content: emailBody,
    };

    await this.emailService.sendEmail(mail);
  }

  async sendPasswordResetEmail(emailTo: User, Token: string) {
    try {
      const email = {
        body: {
          title: 'StarkPay Password Reset',
          name: `${emailTo.firstName + ' ' + emailTo.lastName}`,
          intro: [
            `Please use the otp to complete your StarkPay password reset: <h1 style="color:black"><b>${Token}</b></h1>`,
          ],
          outro:
            "Need help, or have questions? Just reply to this email, we'd love to help.",
        },
      };

      const emailBody = mailGenerator.generate(email);

      const mail: EmailBody = {
        to: emailTo.email,
        subject: 'StarkPay Password Reset',
        content: emailBody,
      };

      await this.emailService.sendEmail(mail);
    } catch (error) {
      console.log(error);
    }
  }
}
