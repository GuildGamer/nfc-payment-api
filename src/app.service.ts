import { Injectable } from '@nestjs/common';
import { config } from 'dotenv';
config();

@Injectable()
export class AppService {
  getHello(): string {
    let apiVersion = '1';

    try {
      apiVersion = process.env.API_VERSION;
    } catch (error) {
      console.log('ERROR: ', error);
    }

    return `StarkPay API v${apiVersion} ${new Date()}`;
  }
}
