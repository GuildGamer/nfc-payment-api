import {
  BadRequestException,
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Bank,
  ReportCategory,
  Role,
  Station,
  User,
  waiters,
} from '@prisma/client';
import axios from 'axios';
import {
  ExcludeFieldsHelper,
  GeneralHelpers,
  OtpHelper,
  toValidPhoneNumber,
} from 'src/common/helpers';
import { CustomResponse, OTPEnum, verifyOtpResponse } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddBankAcountDto,
  ChangePasswordDto,
  ChangePinDto,
  EditEmailDto,
  EditPhoneDto,
  FileReportDto,
  GetBanksDto,
  GetUsersDto,
  JoinWaitListDto,
  SearchUsersDto,
  SendOTPDto,
  UpdateUserDto,
} from './dto';
import { JwtHelper, SendEmailHelper } from 'src/auth/helpers';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';
import { SmsService } from 'src/sms/sms.service';
import { EmailService } from 'src/email/email.service';
import * as argon from 'argon2';
import { Cache } from 'cache-manager';
import { DiscordService } from 'src/discord/discord.service';
// import { SmsServiceEnum } from 'src/sms/types';

@Injectable()
export class UserService {
  logger = new Logger(UserService.name);
  constructor(
    private prisma: PrismaService,
    private excludeFieldsHelper: ExcludeFieldsHelper,
    private readonly config: ConfigService,
    private otpHelper: OtpHelper, // @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtHelper: JwtHelper,
    private emailHelper: SendEmailHelper,
    private smsService: SmsService,
    private emailService: EmailService,
    private discordService: DiscordService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getUser(user: User): Promise<CustomResponse> {
    try {
      const safeUser = await this.excludeFieldsHelper.safeUser(user);
      return <CustomResponse>{
        success: true,
        msg: 'Succesfully retrieved user',
        data: {
          user: safeUser,
        },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to retrieve user',
        data: null,
      });
    }
  }
  async getStation(station: Station): Promise<CustomResponse> {
    try {
      const safeStation = await ExcludeFieldsHelper.safeObject(station, [
        'pinHash',
        'refreshToken',
      ]);
      return <CustomResponse>{
        success: true,
        msg: 'Succesfully retrieved user',
        data: {
          station: safeStation,
        },
      };
    } catch (error) {
      console.log(error);

      return {
        success: false,
        msg: 'Failed to retrieve staton',
        data: null,
      };
    }
  }

  async getCollectionDuration(): Promise<CustomResponse> {
    const { collectionDurationInSeconds } =
      await this.prisma.configuration.findFirst({});

    return {
      success: true,
      msg: ``,
      data: { duration: collectionDurationInSeconds },
    };
  }

  async searchUsers(searchUsersDto: SearchUsersDto) {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip = searchUsersDto.start === 0 ? 0 : searchUsersDto.start - 1;

      const take = searchUsersDto.take ? searchUsersDto.take : numberOfRecords;

      const users = await this.prisma.user.findMany({
        take,
        skip,
        where: {
          OR: [
            {
              id: { search: searchUsersDto.term },
            },
            {
              firstName: { search: searchUsersDto.term },
            },
            {
              lastName: { search: searchUsersDto.term },
            },
            {
              username: { search: searchUsersDto.term },
            },
            {
              phoneNumber: { search: searchUsersDto.term },
            },
            {
              country: {
                name: {
                  search: searchUsersDto.term,
                },
              },
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Search successful',
        data: {
          users,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error while searching users',
        JSON.stringify(error, null, 2),
      );

      return <CustomResponse>{
        success: false,
        msg: 'Failed to search users',
      };
    }
  }

  async getBanks(getBanks: GetBanksDto) {
    try {
      let banks = [];
      if (!getBanks.name) {
        banks = await this.cacheManager.get('banks');

        console.log('Banks cache miss!');
      }

      if (!banks) {
        banks = await this.prisma.bank.findMany({
          where: {
            name: {
              contains: getBanks.name,
            },
          },
        });
      }

      return <CustomResponse>{
        success: true,
        msg: 'Succesfully retrieved banks',
        data: { banks },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to retrieve banks',
        data: null,
      });
    }
  }

  async getUsers(getUsersDto: GetUsersDto): Promise<CustomResponse> {
    try {
      const numberOfRecords = (await this.config.get('NUMBER_OF_TRANSACTIONS'))
        ? +(await this.config.get('NUMBER_OF_TRANSACTIONS'))
        : 20;

      const skip = getUsersDto.start === 0 ? 0 : getUsersDto.start - 1;

      const take = getUsersDto.take ? getUsersDto.take : numberOfRecords;

      if (getUsersDto.createdAtDateStart) {
        getUsersDto.createdAtDateStart.setHours(
          getUsersDto.createdAtDateStart.getHours() + 24,
        );
      }

      const users = await this.prisma.user.findMany({
        take: take,
        skip: skip,
        where: {
          firstName: getUsersDto.firstName,
          lastName: getUsersDto.lastName,
          username: getUsersDto.username,
          active: getUsersDto.active,
          email: getUsersDto.email,
          createdAt: {
            lte: getUsersDto.createdAtDateEnd,
            gte: getUsersDto.createdAtDateStart,
          },
          roles: {
            hasSome: getUsersDto.role
              ? [getUsersDto.role]
              : Object.values(Role),
          },
          emailVerified: getUsersDto.emailVerified,
          identityIsVerified: getUsersDto.identityIsVerified,
          phoneNumberVerified: getUsersDto.phoneNumberVerified,
        },
        select: {
          email: true,
          id: true,
          createdAt: true,
          updatedAt: true,
          firstName: true,
          lastName: true,
          username: true,
          phoneNumber: true,
          roles: true,
          countryId: true,
          identityIsVerified: true,
          twoFactorEnabled: true,
          twoFactorAuthType: true,
          emailVerified: true,
          active: true,
          bankAccount: true,
          wallets: true,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Successfully filtered users',
        data: { users },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: true,
        msg: 'Failed to retrieve users',
        data: null,
      });
    }
  }

  async updateUser(
    user: User,
    updateUserDto: UpdateUserDto,
  ): Promise<CustomResponse> {
    try {
      let updatedUser = user;
      if (
        (updateUserDto.email && updateUserDto.email !== user.email) ||
        !user.emailVerified
      ) {
        updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            ...updateUserDto,
            emailVerified: false,
          },
        });

        const generatedOtp = await this.otpHelper.generateOtp(
          user.id,
          OTPEnum.EMAIL_VERIFICATION,
          user.email,
        );

        this.emailHelper.sendVerificationEmail(updatedUser, generatedOtp);

        const safeUser = await this.excludeFieldsHelper.safeUser(updatedUser);

        return <CustomResponse>{
          success: true,
          msg: 'User updated successfully',
          data: { user: safeUser, emailUpdated: true },
        };
      } else {
        updatedUser = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            username: updateUserDto.username?.toLowerCase(),
          },
        });

        const safeUser = await this.excludeFieldsHelper.safeUser(updatedUser);

        return <CustomResponse>{
          success: true,
          msg: 'User updated successfully',
          data: { user: safeUser, emailUpdated: false },
        };
      }
    } catch (error) {
      console.log(error);

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

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An error occured when updating user',
        data: null,
      });
    }
  }

  async deleteUser(userId: string): Promise<CustomResponse> {
    try {
      await this.prisma.user.delete({
        where: {
          id: userId,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'User deleted successfully',
        data: null,
      };
    } catch (error) {
      console.log(error);

      if (error.code === 'P2003') {
        const fieldName = error.meta['field_name'].split('_')[1];
        console.log(fieldName);

        throw new BadRequestException({
          success: false,
          msg: `${fieldName} ${userId} does not exist`,
          data: null,
        });
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An error occured when deleting user',
        data: null,
      });
    }
  }

  async verifyEmail(otp: string) {
    try {
      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        otp,
        OTPEnum.EMAIL_VERIFICATION,
      );

      if (!verified.valid) {
        throw new BadRequestException({
          success: false,
          msg: verified.msg,
          data: null,
        });
      }

      const user = await this.prisma.user.update({
        data: {
          emailVerified: true,
        },
        where: {
          id: verified.user.id,
        },
      });

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      return <CustomResponse>{
        success: true,
        msg: 'Email Verified',
        data: { user: safeUser },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to verify email',
        data: null,
      });
    }
  }

  async sendOTP(user: User, sendOTPDto: SendOTPDto): Promise<CustomResponse> {
    try {
      if (sendOTPDto.email && sendOTPDto.phoneNumber) {
        throw new ForbiddenException({
          success: false,
          msg: 'Please provide only one of email or phoneNumber',
          data: null,
        });
      }

      if (!sendOTPDto.email && !sendOTPDto.phoneNumber) {
        throw new ForbiddenException({
          success: false,
          msg: 'Please provide at least one of email or phoneNumber',
          data: null,
        });
      }

      const title = 'StarkPay OTP';
      const message = 'Use this OTP for your StarkPay Account: ';

      if (sendOTPDto.email) {
        const generatedOtp = await this.otpHelper.generateOtp(
          user.id,
          OTPEnum.EMAIL_VERIFICATION,
          user.email,
        );

        const content = {
          body: {
            title: title,
            name: `Hi, ${user.firstName + ' ' + user.lastName}`,
            intro: [message, `${generatedOtp}`],
            outro:
              "Need help, or have questions? Just reply to this email, we'd love to help.",
          },
        };

        const emailBody = mailGenerator.generate(content);

        const mail: EmailBody = {
          to: user.email,
          subject: 'StarkPay OTP',
          content: emailBody,
        };

        await this.emailService.sendEmail(mail);
      } else {
        const generatedOtp = await this.otpHelper.generateOtp(
          user.id,
          OTPEnum.EDIT_PHONE_VERIFICATION,
          user.phoneNumber,
        );

        const smsBody = {
          to: sendOTPDto.phoneNumber,
          message: message + generatedOtp,
        };

        await this.smsService.sendSMSPlusDND(smsBody);
      }
      return <CustomResponse>{
        success: true,
        msg: 'OTP has been sent successfully',
        data: null,
      };
    } catch (error) {
      console.log('ERROR:');
      console.log(error);

      if (error.status === 403) {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An while trying to send OTP',
        data: null,
      });
    }
  }

  async editEmail(
    user: User,
    editEmailDto: EditEmailDto,
  ): Promise<CustomResponse> {
    try {
      if (editEmailDto.email === user.email) {
        throw new ForbiddenException({
          success: false,
          msg: 'You cannot update to the same email address',
          data: null,
        });
      }

      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        editEmailDto.otp,
        OTPEnum.EMAIL_VERIFICATION,
        editEmailDto.email,
      );

      if (!verified.valid) {
        throw new BadRequestException({
          success: false,
          msg: verified.msg,
          data: null,
        });
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: editEmailDto.email,
        },
      });

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      return <CustomResponse>{
        success: true,
        msg: 'Email updated successfully',
        data: { user: safeUser },
      };
    } catch (error) {
      console.log(error);

      if (error.status === 400 || error.status === 403) {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An error occured when updating email',
        data: null,
      });
    }
  }

  async editPhoneNumber(
    user: User,
    editPhoneDto: EditPhoneDto,
  ): Promise<CustomResponse> {
    try {
      if (editPhoneDto.phoneNumber === user.email) {
        throw new ForbiddenException({
          success: false,
          msg: 'You cannot update to the same phone number',
          data: null,
        });
      }

      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        editPhoneDto.otp,
        OTPEnum.EDIT_PHONE_VERIFICATION,
        editPhoneDto.phoneNumber,
      );

      if (!verified.valid) {
        throw new BadRequestException({
          success: false,
          msg: verified.msg,
          data: null,
        });
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: editPhoneDto.phoneNumber,
        },
      });

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      return <CustomResponse>{
        success: true,
        msg: 'Phone number updated successfully',
        data: { user: safeUser },
      };
    } catch (error) {
      console.log(error);

      if (error.status === 400 || error.status === 403) {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An error occured when updating phone number',
        data: null,
      });
    }
  }

  async addBankAccount(
    addBankAccountDto: AddBankAcountDto,
    user: any,
  ): Promise<CustomResponse> {
    try {
      const banks: Bank[] = await this.cacheManager.get('banks');
      let bank: Bank;

      if (!banks) {
        bank = await this.prisma.bank.findUnique({
          where: {
            slug: addBankAccountDto.bankSlug,
          },
        });
      } else {
        bank = banks.filter((bank: Bank) => {
          bank.slug = addBankAccountDto.bankSlug;
        })[0];
      }

      if (!user.firstName || !user.lastName) {
        return {
          success: false,
          msg: 'Please ensure that you have set your first name and last name in your profile',
          data: null,
        };
      }

      let data;
      if (
        addBankAccountDto.bankSlug !== 'access-bank' &&
        addBankAccountDto.number !== '0690000031' &&
        addBankAccountDto.number !== '690000032' &&
        addBankAccountDto.number !== '690000033' &&
        addBankAccountDto.number !== '690000034'
      ) {
        const requestUrl = `${this.config.get(
            'PAYSTACK_API_BASE_URL',
          )}/bank/resolve?account_number=${
            addBankAccountDto.number
          }&bank_code=${bank.code}`,
          Authorization = `Bearer ${this.config.get('PAYSTACK_SECRET_KEY')}`;

        const response = await axios.get(requestUrl, {
          timeout: 1500,
          headers: {
            'Content-Type': 'application/json',
            Authorization: Authorization,
          },
        });

        data = response.data.data;

        // remove this account conditional when testing it done

        if (
          !(
            data.account_name
              .toLowerCase()
              .includes(user.firstName.toLowerCase()) &&
            data.account_name
              .toLowerCase()
              .includes(user.lastName.toLowerCase())
          )
        ) {
          return {
            success: false,
            msg: "Account name does not match user's name",
            data: null,
          };
        } else if (
          response.data.message.includes('Could not resolve account name')
        ) {
          return {
            success: false,
            msg: 'Invalid Bank Account. please check the account number and try again',
            data: null,
          };
        }
      }

      let bankAccount = null;

      if (!user.bankAccount) {
        bankAccount = await this.prisma.bankAccount.create({
          data: {
            bankSlug: addBankAccountDto.bankSlug,
            number: addBankAccountDto.number,
            userId: user.id,
            accountName: data?.account_name
              ? data.account_name
              : `${user.firstName} ${user.lastName}`,
          },
          include: {
            bank: true,
          },
        });
      } else {
        bankAccount = await this.prisma.bankAccount.update({
          where: {
            userId: user.id,
          },
          data: {
            bankSlug: addBankAccountDto.bankSlug,
            number: addBankAccountDto.number,
            userId: user.id,
            accountName: data?.account_name
              ? data.account_name
              : `${user.firstName} ${user.lastName}`,
          },
          include: {
            bank: true,
          },
        });
      }

      if (bankAccount === null) {
        return {
          success: false,
          msg: 'There was a problem adding the account. Please check the bank account details and try again.',
          data: null,
        };
      }

      return <CustomResponse>{
        success: true,
        msg: 'The bank account has been added successfully',
        data: { bankAccount },
      };
    } catch (error) {
      this.logger.error(
        `Error adding bank account for user with id ${user.id}`,
        error,
      );

      return {
        success: false,
        msg: 'There was a problem adding the account',
        data: null,
      };
    }
  }

  async getBankAccount(userId: string): Promise<CustomResponse> {
    try {
      const bankAccount = await this.prisma.bankAccount.findUnique({
        where: {
          userId: userId,
        },
        include: {
          bank: true,
        },
      });

      if (!bankAccount) {
        return <CustomResponse>{
          success: true,
          msg: 'You have not added a bank account yet',
          data: {
            bankAccount,
          },
        };
      }

      return <CustomResponse>{
        success: true,
        msg: 'Bank account retrieved successfully',
        data: {
          bankAccount,
        },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to retrieve bank account',
        data: null,
      });
    }
  }

  async changePin(payload: ChangePinDto, userId: string) {
    const { oldPin, newPin } = payload;
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user.hash)
        return {
          success: false,
          msg: 'incorrect pin',
          data: null,
        };

      const passMatches = await argon.verify(user.hash, oldPin);

      if (!passMatches) {
        return {
          success: false,
          msg: 'incorrect pin',
          data: null,
        };
      }

      const hash = await argon.hash(newPin);

      await this.prisma.user.update({
        data: {
          hash,
        },
        where: {
          id: user.id,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Pin changed successfully',
        data: null,
      };
    } catch (error) {
      console.log(error);

      return {
        success: false,
        msg: 'Failed to change pin',
        data: null,
      };
    }
  }

  async changePassword(payload: ChangePasswordDto, userId: string) {
    const { oldPassword, newPassword } = payload;
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user.passwordHash)
        return {
          success: false,
          msg: 'incorrect password',
          data: null,
        };

      const passMatches = await argon.verify(user.passwordHash, oldPassword);

      if (!passMatches) {
        return <CustomResponse>{
          success: false,
          msg: 'incorrect password',
          data: null,
        };
      }

      const passwordHash = await argon.hash(newPassword);

      await this.prisma.user.update({
        data: {
          passwordHash,
        },
        where: {
          id: user.id,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Password changed successfully',
        data: null,
      };
    } catch (error) {
      console.log(error);

      return {
        success: false,
        msg: 'Failed to change password',
        data: null,
      };
    }
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          phoneNumber,
        },
        include: {
          wallets: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to finf user by phone number [${phoneNumber}]`);
      console.log(error);

      throw new Error('failed to find user');
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          username,
        },
        include: {
          wallets: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to finf user by username [${username}]`);
      console.log(error);

      throw new Error('failed to find user');
    }
  }

  async getUserByUniqueIdentifier(
    uniqueIdentifier: string,
  ): Promise<CustomResponse> {
    try {
      const isEmail = GeneralHelpers.isValidEmail(uniqueIdentifier);

      const isPhone = GeneralHelpers.isPhone(uniqueIdentifier);
      let user: User;

      if (isEmail) {
        user = await this.prisma.user.findUnique({
          where: {
            email: uniqueIdentifier,
          },
          include: {
            wallets: true,
            userCards: true,
          },
        });
      } else if (isPhone) {
        uniqueIdentifier = toValidPhoneNumber(uniqueIdentifier);

        user = await this.prisma.user.findUnique({
          where: {
            phoneNumber: uniqueIdentifier,
          },
          include: {
            wallets: true,
            userCards: true,
          },
        });
      } else {
        user = await this.prisma.user.findUnique({
          where: {
            username: uniqueIdentifier,
          },
          include: {
            wallets: true,
            userCards: true,
          },
        });
      }

      if (!user) {
        return <CustomResponse>{
          success: false,
          msg: 'User not found',
        };
      }

      return <CustomResponse>{
        success: true,
        msg: 'Successfully retrieved user',
        data: user,
      };
    } catch (error) {
      this.logger.error(
        'errir getting user by email, phone or username',
        JSON.stringify(error, null, 2),
      );

      return <CustomResponse>{
        success: false,
        msg: 'Failed to get user by email, phone or username',
      };
    }
  }

  async findByUserId(userId: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
    } catch (error) {
      console.log(error);

      throw new Error('failed to find user');
    }
  }

  async joinWaitlist(
    jointWaitListDto: JoinWaitListDto,
  ): Promise<CustomResponse> {
    try {
      let waiter: waiters;

      const existingWaiters = await this.prisma.waiters.findMany({
        where: {
          email: jointWaitListDto.email,
        },
      });

      if (existingWaiters.length == 0) {
        waiter = await this.prisma.waiters.create({
          data: {
            ...jointWaitListDto,
          },
        });
      } else {
        waiter = existingWaiters[0];
      }

      await this.emailHelper.sendWelcomeEmailForWaiters(waiter);

      // sends message to discord server
      this.discordService.sendToDiscord({
        link: 'https://discord.com/api/webhooks/1144617592733040720/qhMG7pdS0171xweglYWyoHAgcijyhWPyWZQdoYLslRBsX4z04-Vx1ZURaylKp-DXi1XT',
        author: `${waiter.fullName}`,
        message: `${waiter.fullName} just joined the waitlist`,
        title: `Plus one waiter!`,
      });

      return <CustomResponse>{
        success: true,
        msg: 'You have successfully joined our waitlist!',
        data: {
          waiter,
        },
      };
    } catch (error) {
      console.log('ERROR adding user to waitlist', error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to add you to waitlist',
        data: null,
      });
    }
  }

  async getReportCategories(): Promise<CustomResponse> {
    return {
      success: true,
      msg: 'Successfully fetched categories',
      data: Object.values(ReportCategory),
    };
  }

  async fileReport(
    fileReportDto: FileReportDto,
    createdById: string,
  ): Promise<CustomResponse> {
    try {
      let userId: any;

      if (fileReportDto.userUniqueIdentifier) {
        const response = await this.getUserByUniqueIdentifier(
          fileReportDto.userUniqueIdentifier,
        );

        if (!response.success) {
          return response;
        }

        const user: any = response.data;
        userId = user.id;
      } else {
        userId = createdById;
      }

      const report = await this.prisma.report.create({
        data: {
          createdById,
          userId,
          content: fileReportDto.content,
          subject: fileReportDto.subject,
          category: fileReportDto.category,
        },
      });

      return {
        success: true,
        msg: 'Successfully filed report',
        data: report,
      };
    } catch (error) {
      this.logger.error('error filing report', JSON.stringify(error, null, 2));

      return {
        success: false,
        msg: 'Failed to file report',
        data: null,
      };
    }
  }
}
