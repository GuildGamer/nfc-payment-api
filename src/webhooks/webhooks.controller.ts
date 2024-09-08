import {
  Controller,
  HttpCode,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto');

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private config: ConfigService,
    private webhooksService: WebhooksService,
  ) {}

  @HttpCode(200)
  @Post('bloc')
  blocWebhook(@Request() req: Request) {
    const hash = crypto
      .createHmac('sha256', this.config.get('BLOC_WEBHOOK_SECRET'))
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (hash == req.headers['X-Bloc-Webhook']) {
      // Retrieve the request's body
      const event = req.body;
      console.log(event);
    }
  }

  @HttpCode(200)
  @Post('flw')
  async flutterwaveWebhook(@Request() req: Request) {
    // If you specified a secret hash, check for the signature
    const secretHash = this.config.get('FLW_SECRET_HASH');
    const signature = req.headers['verif-hash'];

    if (!signature || signature !== secretHash) {
      return new UnauthorizedException('Unauthorized');
    }

    const payload = req.body;
    await this.webhooksService.flutterWaveWebhook(payload);
  }

  @HttpCode(200)
  @Post('pay-stack')
  async payStackWebhook(@Request() req: Request) {
    //validate event
    const secret = this.config.get('PAYSTACK_SECRET_KEY');

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash == req.headers['x-paystack-signature']) {
      const event = req.body;

      await this.webhooksService.payStackWebhook(event);
    }
  }
}
