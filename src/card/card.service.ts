import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { CustomResponse, OTPEnum, verifyOtpResponse } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddNFCCardDto,
  AgentAttachNFCCardDto,
  AgentDisableNFCCardDto,
  GetNFCCardsDto,
  UpdateNFCCardDto,
} from './dto';
import { PushNotificationService } from 'src/push-notification/push-notification.service';
import { Card, CardAction, User } from '@prisma/client';
import { PublicKeyHelper, SendCardEmailHelper } from './helpers';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as argon from 'argon2';
import { UserService } from 'src/user/user.service';
import { OtpHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';

@Injectable()
export class CardService {
  logger = new Logger(CardService.name);

  constructor(
    private prisma: PrismaService,
    private pushNotificationService: PushNotificationService,
    private sendEmailHelper: SendCardEmailHelper,
    private otpHelper: OtpHelper,
    private publicKeyHelper: PublicKeyHelper,
    private config: ConfigService,
    private userService: UserService,
    private emailService: EmailService,
  ) {}

  async createCard(userId: string): Promise<CustomResponse> {
    try {
      const nfcCardNumber = await this.publicKeyHelper.generate();

      const cardSecret = randomBytes(48).toString('base64');
      const hash = await argon.hash(cardSecret);

      const card = await this.prisma.card.create({
        data: {
          createdById: userId,
          hash,
          nfcCardNumber: nfcCardNumber,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Card added successfully',
        data: {
          id: card.id,
          publicKey: card.nfcCardNumber,
          privateKey: cardSecret,
        },
      };
    } catch (error) {
      console.log(error);

      if (error.status === 403) {
        throw error;
      }

      if (error.code === 'P2002') {
        const fieldName = error.meta['target'][0];

        const result = fieldName.replace(/([A-Z])/g, ' $1');
        const finalResult = result.charAt(0).toUpperCase() + result.slice(1);

        throw new ForbiddenException({
          success: false,
          msg: `This ${finalResult} is already taken`,
          data: null,
        });
      }

      throw new ForbiddenException({
        success: false,
        msg: 'There was a problem adding the card',
        data: null,
      });
    }
  }

  async addNFCCard(
    actionBy: string,
    user: any,
    attachCardDto: AddNFCCardDto,
  ): Promise<CustomResponse> {
    try {
      if (attachCardDto.pin) {
        const passMatches = await argon.verify(user.hash, attachCardDto.pin);

        if (!passMatches) {
          return {
            success: false,
            msg: 'Incorrect pin',
            data: null,
          };
        }
      }

      const { nfcCardNumber, walletId, name } = attachCardDto;

      const data = walletId
        ? { walletId, active: true, name, userId: user.id }
        : {
            walletId: user.wallets[0].id,
            active: true,
            name,
            userId: user.id,
          };

      const updatedCard = await this.prisma.card.update({
        where: { nfcCardNumber },
        data,
      });

      await this.prisma.cardHistory.create({
        data: {
          createdById: actionBy,
          cardId: updatedCard.id,
          action: CardAction.ATTACH,
        },
      });

      delete updatedCard.hash;

      // await this.pushNotificationService
      //   .sendPush(userId, 'New Card', 'You have successfully added a new card')
      //   .catch((e) => {
      //     console.log('Error sending push notification', e);
      //   });

      await this.sendEmailHelper.sendCardConnectionEmail(user, nfcCardNumber);

      return <CustomResponse>{
        success: true,
        msg: 'Card added successfully',
        data: { card: updatedCard },
      };
    } catch (error) {
      this.logger.error(
        `An error occurred while adding card with number [${attachCardDto.nfcCardNumber}] to [${user.username}'s] wallet`,
      );
      console.log(error);

      if (error.code === 'P2002') {
        const fieldName = error.meta['target'][0];

        const result = fieldName.replace(/([A-Z])/g, ' $1');
        const finalResult = result.charAt(0).toUpperCase() + result.slice(1);

        return {
          success: false,
          msg: `This ${finalResult} is already taken`,
          data: null,
        };
      }

      return {
        success: false,
        msg: 'There was a problem adding the card',
        data: null,
      };
    }
  }

  async removeNFCCard(nfcCardId: number, user: User): Promise<CustomResponse> {
    try {
      const card = await this.prisma.card.update({
        where: {
          id: nfcCardId,
        },
        data: {
          userId: null,
          name: null,
        },
      });

      await this.prisma.cardHistory.create({
        data: {
          createdById: user.id,
          cardId: card.id,
          action: CardAction.DETTACH,
        },
      });

      await this.sendEmailHelper.sendCardDisconnectionEmail(
        user,
        card.nfcCardNumber,
      );

      return <CustomResponse>{
        success: true,
        msg: 'Card removed successfully',
        data: null,
      };
    } catch (error) {
      if (error.status === 403) {
        throw error;
      }

      throw new ForbiddenException({
        success: false,
        msg: 'There was a problem removing the card',
        data: null,
      });
    }
  }

  async getNFCCard(cardId: number, userId: string): Promise<CustomResponse> {
    try {
      const cards = await this.prisma.card.findMany({
        where: {
          AND: [{ id: cardId }, { userId }],
        },
      });

      const card = cards[0];

      if (card.userId !== userId) {
        throw new ForbiddenException({
          success: false,
          msg: 'You are not allowed to perform this action',
          data: null,
        });
      }

      delete card.hash;

      return <CustomResponse>{
        success: true,
        msg: 'Card fetched successfully',
        data: { card },
      };
    } catch (error) {
      console.log(error);

      throw new ForbiddenException({
        success: false,
        msg: 'There was a problem fetching the card',
        data: null,
      });
    }
  }

  async getNFCCards(userId: string): Promise<CustomResponse> {
    try {
      const cards = await this.prisma.card.findMany({
        where: {
          userId: userId,
        },
      });

      cards.forEach((card) => {
        delete card.hash;
      });

      return <CustomResponse>{
        success: true,
        msg: 'Cards fetched successfully',
        data: { cards },
      };
    } catch (error) {
      console.log(error);

      throw new ForbiddenException({
        success: false,
        msg: 'There was a problem fetching the cards',
        data: null,
      });
    }
  }

  async getAllNFCCards(
    getAllNFCCardsDto: GetNFCCardsDto,
  ): Promise<CustomResponse> {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip =
        getAllNFCCardsDto.start === 0 ? 0 : getAllNFCCardsDto.start - 1;

      const take = getAllNFCCardsDto.take
        ? getAllNFCCardsDto.take
        : numberOfRecords;

      const cards = await this.prisma.card.findMany({
        take: take,
        skip: skip,
        where: {
          createdAt: {
            lte: getAllNFCCardsDto.toDate,
            gte: getAllNFCCardsDto.fromDate,
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      cards.forEach((card) => {
        delete card.hash;
      });

      return <CustomResponse>{
        success: true,
        msg: 'Cards fetched successfully',
        data: { cards },
      };
    } catch (error) {
      console.log(error);

      throw new ForbiddenException({
        success: false,
        msg: 'There was a problem fetching the cards',
        data: null,
      });
    }
  }

  async updateNFCCard(
    updateNFCCardDto: UpdateNFCCardDto,
    user: User,
    nfcCardNumber: string,
  ): Promise<CustomResponse> {
    try {
      if (updateNFCCardDto.pin) {
        const passMatches = await argon.verify(user.hash, updateNFCCardDto.pin);

        if (!passMatches) {
          return {
            success: false,
            msg: 'Incorrect pin',
            data: null,
          };
        }
      }

      const card = await this.prisma.card.findUnique({
        where: {
          nfcCardNumber: nfcCardNumber,
        },
      });

      if (!card) {
        return {
          success: false,
          msg: 'Card not found',
          data: null,
        };
      }

      if (card.userId !== user.id) {
        return {
          success: false,
          msg: 'You are not allowed to update this card',
          data: null,
        };
      }

      const updatedCard = await this.prisma.card.update({
        where: {
          nfcCardNumber: nfcCardNumber,
        },
        data: {
          ...updateNFCCardDto,
        },
      });

      if (updateNFCCardDto?.active === false) {
        await this.prisma.cardHistory.create({
          data: {
            createdById: user.id,
            cardId: card.id,
            action: CardAction.DISABLE,
          },
        });
      } else if (updateNFCCardDto?.active === true) {
        await this.prisma.cardHistory.create({
          data: {
            createdById: user.id,
            cardId: card.id,
            action: CardAction.ENABLE,
          },
        });
      }

      return <CustomResponse>{
        success: true,
        msg: 'Card updated successfully',
        data: { card: updatedCard },
      };
    } catch (error) {
      console.log(error);

      if (error.status === 403) {
        throw error;
      }

      if (error.code === 'P2002') {
        const fieldName = error.meta['target'][0];

        const result = fieldName.replace(/([A-Z])/g, ' $1');
        const finalResult = result.charAt(0).toUpperCase() + result.slice(1);

        throw new ForbiddenException({
          success: false,
          msg: `This ${finalResult} is already taken`,
          data: null,
        });
      }

      throw new ForbiddenException({
        success: false,
        msg: 'There was a problem updating the card',
        data: null,
      });
    }
  }

  async deleteNFCCard(
    nfcCardId: number,
    userId: string,
  ): Promise<CustomResponse> {
    try {
      await this.prisma.card.delete({
        where: {
          id: nfcCardId,
        },
      });

      await this.prisma.cardHistory.create({
        data: {
          createdById: userId,
          cardId: nfcCardId,
          action: CardAction.DELETE,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Card deleted successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error('error deleting card', JSON.stringify(error, null, 2));

      return {
        success: false,
        msg: 'There was a problem updating the card',
        data: null,
      };
    }
  }

  async findByHash(hash: string): Promise<Card | null> {
    try {
      return this.prisma.card.findUnique({
        where: { hash },
      });
    } catch (error) {
      console.log(error);

      throw new Error('Failed to find card');
    }
  }

  async sendOTP(userId: string, tokenType: OTPEnum): Promise<CustomResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      const generatedOtp = await this.otpHelper.generateOtp(
        user.id,
        tokenType,
        user.email,
      );

      const email = {
        body: {
          name: `${user.username}`,
          intro: [
            `Please use the otp to verify the card action: <h1 style="color:black"><b>${generatedOtp}</b></h1>`,
          ],
          outro:
            "Need help, or have questions? Just reply to this email, we'd love to help.",
        },
      };

      const emailBody = mailGenerator.generate(email);

      const mail: EmailBody = {
        to: user.email,
        subject: 'StarkPay Email Verification',
        content: emailBody,
      };

      await this.emailService.sendEmail(mail);

      return {
        success: true,
        msg: 'OTP sent successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error(
        `error sending OTP[${tokenType}] to ${userId}`,
        JSON.stringify(error, null, 2),
      );

      return {
        success: false,
        msg: 'Failed to send OTP',
        data: null,
      };
    }
  }

  async agentAttachNFCCard(
    agentAttachNFCCardDto: AgentAttachNFCCardDto,
    userId: string,
  ): Promise<CustomResponse> {
    try {
      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        agentAttachNFCCardDto.OTP,
        OTPEnum.ADD_CARD,
      );

      if (!verified) {
        return {
          success: false,
          msg: verified.msg,
          data: null,
        };
      }

      const getUserReponse: any =
        await this.userService.getUserByUniqueIdentifier(
          agentAttachNFCCardDto.userUniqueIdentifier,
        );

      if (!getUserReponse.success) {
        return getUserReponse;
      }

      const response = await this.addNFCCard(
        userId,
        { id: getUserReponse.data.id, wallets: getUserReponse.data.wallets },
        agentAttachNFCCardDto,
      );

      return response;
    } catch (error) {
      this.logger.error('error attaching card', JSON.stringify(error, null, 2));

      console.log(error);

      return <CustomResponse>{
        success: false,
        msg: 'Failed to attach card',
      };
    }
  }

  async agentDisableNFCCard(
    agentDisableNFCCardDto: AgentDisableNFCCardDto,
    userId: string,
  ): Promise<CustomResponse> {
    try {
      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        agentDisableNFCCardDto.OTP,
        OTPEnum.DISABLE_CARD,
      );

      const oldCard = await this.prisma.card.findUnique({
        where: {
          nfcCardNumber: agentDisableNFCCardDto.nfcCardNumber,
        },
      });

      if (!verified.valid) {
        return {
          success: false,
          msg: verified.msg,
          data: null,
        };
      }

      console.log('OLD CARD USERID', oldCard.userId);
      console.log('VERIFIED CARD USERID', verified.user.id);

      if (oldCard.userId != verified.user.id) {
        return {
          success: false,
          msg: 'Invalid card number',
          data: null,
        };
      }

      await this.prisma.card.update({
        where: {
          nfcCardNumber: agentDisableNFCCardDto.nfcCardNumber,
        },
        data: {
          active: false,
        },
      });

      await this.prisma.cardHistory.create({
        data: {
          createdById: userId,
          cardId: oldCard.id,
          action: CardAction.DISABLE,
        },
      });

      return {
        success: true,
        msg: 'Card disabled successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error('error disabling card', JSON.stringify(error, null, 2));

      console.log(error);

      return <CustomResponse>{
        success: false,
        msg: 'Failed to disable card',
      };
    }
  }
}
