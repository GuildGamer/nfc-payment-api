import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailBody } from './dto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const { google } = require('googleapis');

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  async nodeMailer(mail: object) {
    try {
      // const OAuth2 = google.auth.OAuth2;

      // const oauth2Client = new OAuth2(
      //   this.configService.get('GOOGLE_CLIENT_ID'), // ClientID
      //   this.configService.get('GOOGLE_CLIENT_SECRET'), // Client Secret
      //   'https://developers.google.com/oauthplayground', // Redirect URL
      // );

      // oauth2Client.setCredentials({
      //   refresh_token: this.configService.get('GOOGLE_REFRESH_TOKEN'),
      // });

      // const accessToken = await oauth2Client.getAccessToken();

      // const smtpTransport = nodemailer.createTransport({
      //   service: 'gmail',
      //   host: 'smtp.gmail.com',
      //   secure: 'true',
      //   port: '465',
      //   auth: {
      //     type: 'OAuth2',
      //     user: this.configService.get('EMAIL'),
      //     clientId: this.configService.get('GOOGLE_CLIENT_ID'),
      //     clientSecret: this.configService.get('GOOGLE_CLIENT_SECRET'),
      //     refreshToken: this.configService.get('GOOGLE_REFRESH_TOKEN'),
      //     accessToken: accessToken,
      //   },
      //   tls: {
      //     rejectUnauthorized: false,
      //     ciphers: 'SSLv3',
      //   },
      // });

      const smtpTransport = nodemailer.createTransport({
        host: 'smtppro.zoho.com',
        secure: 'true',
        port: '465',
        auth: {
          user: this.configService.get('EMAIL'),
          pass: this.configService.get('EMAIL_PASSWORD'),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const info = smtpTransport.sendMail(mail, () => {
        smtpTransport.close();
      });

      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
      console.log(error);

      throw new Error('Failed to send email');
    }
  }

  async sendEmail(emailBody: EmailBody, attachments?: any[]): Promise<void> {
    try {
      const mail = {
        to: emailBody.to,
        subject: emailBody.subject,
        from: `StarkPay <${this.configService.get('EMAIL')}>`,
        text: null,
        html: emailBody.content,
        attachments,
      };

      await this.nodeMailer(mail);
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: error,
        data: null,
      });
    }
  }
}
