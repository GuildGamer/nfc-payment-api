import { Injectable, Logger } from '@nestjs/common';
import { Webhook, MessageBuilder } from 'discord-webhook-node';
import { IDiscord } from './types';

@Injectable()
export class DiscordService {
  logger = new Logger('DiscordService');

  async sendToDiscord(payload: IDiscord) {
    // send to discord
    const { link, title, author, message } = payload;
    try {
      const hook = new Webhook(link);
      const embed = await new MessageBuilder()
        .setTitle(title)
        .setAuthor(author)
        .setDescription(message);
      hook.send(embed);
      this.logger.log('Discord notification sent');
    } catch (e) {
      this.logger.error('@discord', e);
      throw new Error(e);
    }
  }
}
