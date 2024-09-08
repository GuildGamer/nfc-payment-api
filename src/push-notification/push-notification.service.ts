import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as firebase from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';
import { SavePushNotificationTokenDto } from './dto';
import { CustomResponse } from 'src/common/types';
import { config } from 'dotenv';
import { expoSoundType, priority } from './types';
import { Expo } from 'expo-server-sdk';
import { ConfigService } from '@nestjs/config';
config();

// firebase.initializeApp({
//   credential: firebase.credential.cert(
//     path.join(__dirname, '..', '..', 'bus-stop-sdk.json'),
//   ),
// });

firebase.initializeApp({
  credential: firebase.credential.cert(
    JSON.parse(process.env.BUS_STOP_FIREBASE_SDK_CONFIG),
  ),
});

@Injectable()
export class PushNotificationService {
  logger = new Logger(PushNotificationService.name);
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async savePushNotificationToken(
    userId: string,
    savePushNotificationDto: SavePushNotificationTokenDto,
  ): Promise<CustomResponse> {
    try {
      const notificationToken = await this.prisma.notificationToken.create({
        data: {
          ...savePushNotificationDto,
          userId: userId,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Saved successfully',
        data: { notificationToken },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to save token',
        data: null,
      });
    }
  }

  async updatePushNotificationToken(
    token: string,
    userId: string,
    newToken?: string,
  ): Promise<CustomResponse> {
    try {
      const notificationToken = await this.prisma.notificationToken.update({
        where: {
          notificationToken: token,
        },
        data: {
          userId,
          notificationToken: newToken,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Saved successfully',
        data: { notificationToken },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to save token',
        data: null,
      });
    }
  }

  async getPushNotificationToken(userId: string): Promise<CustomResponse> {
    try {
      const tokens = await this.prisma.notificationToken.findMany({
        where: {
          userId: userId,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Retrieved successfully',
        data: { tokens },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to get tokens',
        data: null,
      });
    }
  }

  async selectPushTokenTypeAndSend(
    token: string,
    title: string,
    body: string,
    type: string,
    balance?: string,
  ) {
    try {
      if (Expo.isExpoPushToken(token)) {
        await this.sendExpoPushNotification(token, title, body, type, balance);
      } else {
        await this.sendPushNotification(token, title, body, type, balance);
      }
    } catch (error) {
      this.logger.error(
        'Error sending push notification',
        JSON.stringify(error),
        null,
        2,
      );
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    type: string,
    balance?: string,
  ): Promise<CustomResponse> {
    try {
      // This registration token comes from the client FCM SDKs.

      const high: priority = 'high';

      const message = {
        notification: {
          title,
          body,
        },
        data: {
          type,
          balance,
        },
        android: {
          priority: high,
        },
        token: token,
      };

      // Send a message to the device corresponding to the provided
      // registration token.

      const messaging = firebase.messaging();

      let success = false;
      let responseMessage = '';

      messaging
        .send(message)
        .then((response) => {
          // Response is a message ID string.
          responseMessage = 'Successfully sent message';
          success = true;
          console.log(`${responseMessage}:`, response);
        })
        .catch(async (error) => {
          responseMessage = 'Error sending message';
          if (
            error?.errorInfo.message ===
            'The registration token is not a valid FCM registration token'
          ) {
            await this.prisma.notificationToken.delete({
              where: {
                notificationToken: token,
              },
            });
          }
          console.log(`${responseMessage}:`, error);
        });

      return <CustomResponse>{
        success: success,
        msg: responseMessage,
        data: null,
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Error sending message',
        data: null,
      });
    }
  }

  async sendExpoPushNotification(
    token: string,
    title: string,
    body: string,
    type: string,
    balance?: string,
  ) {
    try {
      const expoAccessToken: string = this.config.get('EXPO_ACCESS_TOKEN');
      const expo = new Expo({ accessToken: expoAccessToken });

      if (!Expo.isExpoPushToken(token)) {
        console.error(`Push token ${token} is not a valid Expo push token`);

        await this.prisma.notificationToken.delete({
          where: {
            notificationToken: token,
          },
        });
      }

      const sound: expoSoundType = 'default';

      const messages = [
        {
          to: token,
          title: title,
          sound: sound,
          body: body,
          data: {
            type,
            balance,
          },
        },
      ];

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];
      (async () => {
        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log(ticketChunk);
            tickets.push(...ticketChunk);
          } catch (error) {
            console.error(error);
          }
        }
      })();

      await this.retrieveReceipts(tickets);
    } catch (error) {
      console.log(error);
    }
  }

  async retrieveReceipts(tickets: any[]) {
    try {
      const expoAccessToken: string = this.config.get('EXPO_ACCESS_TOKEN');
      const expo = new Expo({ accessToken: expoAccessToken });

      const receiptIds = [];
      for (const ticket of tickets) {
        if (ticket.id) {
          receiptIds.push(ticket.id);
        }
      }

      const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of receiptIdChunks) {
        try {
          const receipts: any = await expo.getPushNotificationReceiptsAsync(
            chunk,
          );
          console.log(receipts);

          for (const receiptId in receipts) {
            const { status, message, details } = receipts[receiptId];
            if (status === 'ok') {
              continue;
            } else if (status === 'error') {
              console.error(
                `There was an error sending a notification: ${message}`,
              );
              if (details && details?.error) {
                console.error(`The error code is ${details.error}`);
              }

              throw new ServiceUnavailableException({
                success: false,
                msg: 'Error sending message',
                data: null,
              });
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  async sendManyPushNotifications(
    tokens: string[],
    title: string,
    body: string,
  ): Promise<CustomResponse> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        tokens,
      };

      // Send a message to the device corresponding to the provided
      // registration token.

      const messaging = firebase.messaging();

      const success = false;
      const responseMessage = '';

      messaging.sendEachForMulticast(message).then((response) => {
        console.log(response.successCount + ' messages were sent successfully');
      });

      return <CustomResponse>{
        success: success,
        msg: responseMessage,
        data: null,
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Error sending message',
        data: null,
      });
    }
  }

  async removePushNotificationToken(tokenId: string): Promise<CustomResponse> {
    try {
      await this.prisma.notificationToken.delete({
        where: { id: tokenId },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Successfully removed token',
        data: null,
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to remove token',
        data: null,
      });
    }
  }
}
