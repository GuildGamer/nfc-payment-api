import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendSmsDto } from './dto';
import axios from 'axios';
import { SmsServiceEnum } from './types';
@Injectable()
export class SmsService {
  logger = new Logger(SmsService.name);
  constructor(private config: ConfigService) {}

  async searchPhoneNumber(phoneNumber: string): Promise<any> {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      const params = {
        api_key: await this.config.get('TERMII_API_KEY'),
        phone_number: phoneNumber.replace('+', ''),
      };

      const response = await axios.get(
        `https://api.ng.termii.com/api/check/dnd`,
        {
          params,
          headers,
        },
      );

      console.log('SEARCH', response.data);

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error searching number [${phoneNumber}]`,
        JSON.stringify(error, null, 2),
      );
    }
  }

  async sendSMSPlusDND(sendSmsDto: SendSmsDto) {
    const phoneNumberDetails = await this.searchPhoneNumber(sendSmsDto.to);

    console.log(phoneNumberDetails);

    if (!phoneNumberDetails) {
      console.log('FAILED');
      // return this.sendSMSBulkSMSNigeria(sendSmsDto);
    } else if (phoneNumberDetails.data.status === 'DND blacklisted') {
      return this.sendSMSTermii(sendSmsDto);
    } else {
      return this.sendSMSBulkSMSNigeria(sendSmsDto);
    }
  }

  sendSMS(sendSmsDto: SendSmsDto, service: SmsServiceEnum): Promise<boolean> {
    if (service === SmsServiceEnum.AFRICAS_TALKING) {
      return this.sendSMSAfricasTalking(sendSmsDto);
    } else if (service === SmsServiceEnum.BULK_SMS_NG) {
      return this.sendSMSBulkSMSNigeria(sendSmsDto);
    } else if (service === SmsServiceEnum.TERMII) {
      return this.sendSMSTermii(sendSmsDto);
    }
  }
  async sendSMSAfricasTalking(sendSmsDto: SendSmsDto): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AfricasTalking = require('africastalking');

      const africastalking = AfricasTalking({
        apiKey: this.config.get('AFRICAS_TALKING_API_KEY'),
        username: this.config.get('AFRICAS_TALKING_USERNAME'),
      });

      const result = await africastalking.SMS.send({
        to: sendSmsDto.to,
        message: sendSmsDto.message,
        from: this.config.get('AFRICAS_TALKING_SENDER_ID'),
      });
      console.log(result);

      return true;
    } catch (error) {
      console.error(error);

      return false;
    }
  }

  async sendSMSBulkSMSNigeria(sendSmsDto: SendSmsDto): Promise<boolean> {
    try {
      const data = {
        from: 'StarkPay',
        to: sendSmsDto.to.replace('+', ''),
        body: sendSmsDto.message,
        api_token: this.config.get('BULK_SMS_NG_API_TOKEN'),
        gateway: 1,
      };

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      const response = await axios.post(
        `https://www.bulksmsnigeria.com/api/v2/sms`,
        JSON.stringify(data),
        {
          headers,
        },
      );

      const responseData = response.data;

      if (responseData.error) {
        console.log(`Error from Bulk SMS NG`, responseData);
        return false;
      } else if (responseData.data.status === 'success') {
        return true;
      } else {
        console.log(responseData);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error Sending SMS to ${sendSmsDto.to}`,
        JSON.stringify(error, null, 2),
      );

      return false;
    }
  }

  async sendSMSTermii(sendSmsDto: SendSmsDto, DND = false): Promise<boolean> {
    try {
      const data = {
        from: 'StarkPay',
        to: sendSmsDto.to.replace('+', ''),
        sms: sendSmsDto.message,
        api_key: this.config.get('TERMII_API_KEY'),
        channel: DND ? 'dnd' : 'generic',
        type: 'plain',
      };

      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      };

      const response = await axios.post(
        `https://api.ng.termii.com/api/sms/send`,
        JSON.stringify(data),
        {
          headers,
        },
      );

      const responseData = response.data;

      console.log('Termi Response', responseData);

      if (responseData.message === 'Successfully Sent') {
        return true;
      } else {
        console.log(responseData);
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error Sending SMS[Termii] to ${sendSmsDto.to}`,
        JSON.stringify(error, null, 2),
      );

      return false;
    }
  }
}
