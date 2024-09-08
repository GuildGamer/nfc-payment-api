import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddBankAcountForBusinessDto,
  ChangeStationPasswordDto,
  CompleteStationPasswordResetDto,
  CreateStationDto,
  GetStationsDto,
  GetTransactionsDto,
  RegisterBusinessDto,
  ScheduleCallDto,
  UpdateBusinessDto,
  UpdateStationDto,
} from './dto';
import { CustomResponse, OTPEnum, verifyOtpResponse } from 'src/common/types';
import {
  Bank,
  Prisma,
  Role,
  RoleInBusinessEnum,
  Transaction,
  TransactionStatus,
  TransactionType,
  User,
} from '@prisma/client';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as argon from 'argon2';
import { ExcludeFieldsHelper, OtpHelper } from 'src/common/helpers';
import { EmailService } from 'src/email/email.service';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';
import { DiscordService } from 'src/discord/discord.service';
import { SendEmailHelper } from './helpers';

@Injectable()
export class BusinessService {
  logger = new Logger(BusinessService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly config: ConfigService,
    private otpHelper: OtpHelper,
    private emailHelper: SendEmailHelper,
    private readonly emailService: EmailService,
    private discordService: DiscordService,
  ) {}

  async scheduleCall(dto: ScheduleCallDto): Promise<CustomResponse> {
    try {
      await this.prisma.scheduleBusiness.create({
        data: { ...dto },
      });

      const email = {
        body: {
          name: `${dto.name}`,
          intro: [
            `Thank you for reaching out and scheduling a call with us. We appreciate your interest in StarkPay`,
            `Your request has been received and our team will reach out to you shortly to confirm the details and schedule a call at a time convenient for you.`,
            `In the meantime, if you have any urgent questions or concerns, feel free to reach out to us directly at <a href="mailto:support@starkpay.africa">support@starkpay.africa</a>.`,
            `We look forward to speaking with you soon.`,
          ],
        },
      };

      const emailBody = mailGenerator.generate(email);

      const mail: EmailBody = {
        to: dto.email.trim(),
        subject: `Acknowledgement of Your Call Request`,
        content: emailBody,
      };

      await this.emailService.sendEmail(mail);

      this.discordService.sendToDiscord({
        link: 'https://discord.com/api/webhooks/1144617592733040720/qhMG7pdS0171xweglYWyoHAgcijyhWPyWZQdoYLslRBsX4z04-Vx1ZURaylKp-DXi1XT',
        author: dto.name,
        message: `${dto.name} [BUSINESS] just scheduled a call. Their business email is ${dto.email}`,
        title: `Please schedule a call with ${dto.name}`,
      });

      return {
        success: true,
        msg: `Successfully scheduled call`,
        data: null,
      };
    } catch (error) {
      this.logger.error(
        'Failed to schedule call',
        JSON.stringify(error, null, 2),
      );

      console.log(error);

      return {
        success: false,
        msg: 'Failed to schedule call',
        data: null,
      };
    }
  }
  async registerBusiness(
    registerBusinessDto: RegisterBusinessDto,
    userId: string,
  ): Promise<CustomResponse> {
    try {
      const { email } = registerBusinessDto;
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return {
          success: false,
          msg: 'User not found',
          data: null,
        };
      }

      if (user.businessId) {
        return {
          success: false,
          msg: 'You have already registered a business',
          data: null,
        };
      }

      if (!user.roles.includes(Role.BUSINESS)) {
        await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            roles: {
              push: Role.BUSINESS,
            },
          },
        });
      }

      const business = await this.prisma.business.create({
        data: {
          ...registerBusinessDto,
        },
      });

      await this.prisma.wallet.create({
        data: {
          businessId: business.id,
        },
      });

      const generatedOtp = await this.otpHelper.generateOtp(
        user.id,
        OTPEnum.EMAIL_VERIFICATION,
        email,
      );

      this.emailHelper.sendVerificationEmail(user, generatedOtp, email);

      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          businessId: business.id,
          roleInBusiness: RoleInBusinessEnum.ADMIN,
        },
      });

      return {
        success: true,
        msg: 'Successfully created business',
        data: business,
      };
    } catch (error) {
      this.logger.error(
        'Failed to register business',
        JSON.stringify(error, null, 2),
      );

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
        msg: 'Failed to register business',
        data: null,
      };
    }
  }

  async resendOTP(user: User): Promise<CustomResponse> {
    const { businessId, id } = user;
    try {
      const { email } = await this.prisma.business.findUnique({
        where: {
          id: businessId,
        },
      });

      const generatedOtp = await this.otpHelper.generateOtp(
        id,
        OTPEnum.EMAIL_VERIFICATION,
        email,
      );

      this.emailHelper.sendVerificationEmail(user, generatedOtp, email);

      return {
        success: true,
        msg: `OTP sent`,
        data: {},
      };
    } catch (error) {
      this.logger.error(`Resending business email verification OTP`);

      console.log(error);

      return {
        success: false,
        msg: ``,
        data: {},
      };
    }
  }

  async updateBusiness(
    dto: UpdateBusinessDto,
    user: User,
  ): Promise<CustomResponse> {
    try {
      const { email } = dto;
      const { id, businessId } = user;

      if (!businessId) {
        return {
          success: false,
          msg: 'Please create a business first',
          data: {},
        };
      }

      if (email) {
        const generatedOtp = await this.otpHelper.generateOtp(
          id,
          OTPEnum.EMAIL_VERIFICATION,
          email,
        );

        this.emailHelper.sendVerificationEmail(user, generatedOtp, email);
        dto['emailVerified'] = false;
      }

      const business = await this.prisma.business.update({
        where: {
          id: businessId,
        },
        data: {
          ...dto,
        },
      });

      return {
        success: true,
        msg: ``,
        data: business,
      };
    } catch (error) {
      this.logger.error(``);

      console.log(error);

      return {
        success: false,
        msg: ``,
        data: {},
      };
    }
  }

  async verifyEmail(otp: string): Promise<CustomResponse> {
    try {
      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        otp,
        OTPEnum.EMAIL_VERIFICATION,
      );

      if (!verified.valid) {
        return {
          success: false,
          msg: verified.msg,
          data: null,
        };
      }

      const business = await this.prisma.business.update({
        data: {
          emailVerified: true,
        },
        where: {
          id: verified.user.businessId,
        },
        include: {
          wallets: true,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Email verified',
        data: business,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify email for business: ${error.message}`,
      );

      return {
        success: false,
        msg: 'Failed to verify email',
        data: null,
      };
    }
  }

  async getMyBusiness(user: User): Promise<CustomResponse> {
    try {
      const business = await this.prisma.business.findUnique({
        where: {
          id: user.businessId,
        },
      });

      return {
        success: true,
        msg: 'Retrieved business successfully',
        data: business,
      };
    } catch (error) {
      this.logger.error(`Failed to get business`);

      return {
        success: false,
        msg: 'Failed to get a business',
        data: null,
      };
    }
  }

  async getTransactions(
    getTransactionsDto: GetTransactionsDto,
    user: User,
  ): Promise<CustomResponse> {
    try {
      const transactions = await this.prisma.transaction.findMany({
        take: getTransactionsDto.take,
        skip: getTransactionsDto.start,
        where: {
          businessId: user.businessId,
          type: TransactionType.PAYMENT,
          createdAt: {
            lte: getTransactionsDto.toDate,
            gte: getTransactionsDto.fromDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        msg: 'Transactions retrieved successfully',
        data: transactions,
      };
    } catch (error) {
      this.logger.error(
        `Error while getting business's transactions [${user.businessId}]`,
        JSON.stringify(error, null, 2),
      );

      return {
        success: false,
        msg: 'Failed to get transactions',
        data: null,
      };
    }
  }

  async getTotalTransactionAmountByDay(businessId: string): Promise<any[]> {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );

    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );

    const query = Prisma.sql`
    SELECT
      EXTRACT(DAY FROM all_days.day) AS day_of_month,
      COALESCE(SUM("transactions"."amount"), 0) AS totalAmount
    FROM
      (
        SELECT
          generate_series(
            ${firstDayOfMonth}::timestamp,
            ${lastDayOfMonth}::timestamp,
            '1 day'::interval
          )::date AS day
      ) AS all_days
    LEFT JOIN "transactions" ON DATE("transactions"."createdAt") = all_days.day
                            AND "transactions"."businessId" = ${businessId}
                            AND "transactions"."type" = 'PAYMENT'
                            AND "transactions"."status" = 'SUCCESSFUL'
    GROUP BY
      day_of_month
    ORDER BY
      day_of_month;
    `;

    const totalAmountByDay: any[] = await this.prisma.$queryRaw(query);

    return totalAmountByDay;
  }

  async getWithdrawalBalance(businessId: string): Promise<number> {
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      let { amount } = (
        await this.prisma.transaction.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            businessId,
            createdAt: {
              gte: twoDaysAgo, // Use 'gte' to get transactions greater than or equal to two days ago
            },
          },
        })
      )._sum;

      const { balance, business } = await this.prisma.wallet.findUnique({
        where: {
          businessId,
        },
        include: {
          business: true,
        },
      });

      amount = amount ?? 0;
      const serviceFee = (business.serviceFeePercentage / 100) * balance;

      return balance - (serviceFee + amount); // remove StarkPay's service fee and the money collected in the last 2 days since  Flutterwave's settlement is in 2 days;
    } catch (error) {
      return null;
    }
  }

  async getMyDashboardData(user: User): Promise<CustomResponse> {
    try {
      const { businessId } = user;
      const totalStations = await this.prisma.station.count({
        where: {
          businessId,
        },
      });

      let totalRevenue = (
        await this.prisma.transaction.aggregate({
          where: {
            businessId,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESSFUL,
          },
          _sum: {
            amount: true,
          },
        })
      )._sum.amount;

      totalRevenue = totalRevenue ? totalRevenue : 0;

      const totalTransactions = await this.prisma.transaction.count({
        where: {
          businessId,
          type: TransactionType.PAYMENT,
        },
      });
      const today = new Date();
      const firstDayOfTheMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
      const lastDayOfTheMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      );

      const firstDateOfPreviousMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );

      const lastDateOfPreviousMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        0,
      );

      let totalRevenueThisMonth = (
        await this.prisma.transaction.aggregate({
          where: {
            businessId,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCESSFUL,
            createdAt: {
              lte: lastDayOfTheMonth,
              gte: firstDayOfTheMonth,
            },
          },
          _sum: {
            amount: true,
          },
        })
      )._sum.amount;

      totalRevenueThisMonth = totalRevenueThisMonth ? totalRevenueThisMonth : 0;

      const totalTransactionsThisMonth = await this.prisma.transaction.count({
        where: {
          businessId,
          type: TransactionType.PAYMENT,
          createdAt: {
            lte: lastDayOfTheMonth,
            gte: firstDayOfTheMonth,
          },
        },
      });

      const totalTransactionsLastMonth = await this.prisma.transaction.count({
        where: {
          businessId,
          type: TransactionType.PAYMENT,
          createdAt: {
            lte: lastDateOfPreviousMonth,
            gte: firstDateOfPreviousMonth,
          },
        },
      });

      const oneMonthTransactionNumberDifference =
        totalTransactionsThisMonth - totalTransactionsLastMonth;

      let oneMonthTransactionPercentageDifference =
        (oneMonthTransactionNumberDifference / totalTransactionsLastMonth) *
        100;

      oneMonthTransactionPercentageDifference =
        oneMonthTransactionPercentageDifference
          ? oneMonthTransactionPercentageDifference
          : 0;

      const stations = await this.prisma.station.findMany({
        where: {
          businessId,
        },
        include: {
          transactions: true,
        },
      });

      stations.map((station: any) => {
        let totalAmount = 0;

        station.transactions.map((transaction: Transaction) => {
          totalAmount += transaction.amount;
        });

        ExcludeFieldsHelper.safeObject(station, ['refreshToken', 'pinHash']);
        station.totalAmount = totalAmount;
      });

      const transactionByDay = await this.getTotalTransactionAmountByDay(
        businessId,
      );

      const totalWithdrawalAmount =
        (await this.getWithdrawalBalance(businessId)) ?? 0;

      return {
        success: true,
        msg: 'Got dashboard data successfully',
        data: {
          totalStations,
          totalRevenue,
          totalTransactions,
          totalRevenueThisMonth,
          totalWithdrawalAmount,
          totalTransactionsThisMonth,
          oneMonthTransactionNumberDifference,
          oneMonthTransactionPercentageDifference,
          stationsSummary: stations,
          transactionByDay,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard data`, error);

      return {
        success: false,
        msg: 'Failed to get dashboard data',
        data: null,
      };
    }
  }

  async addBankAccount(
    addBankAccountDto: AddBankAcountForBusinessDto,
    user: User,
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

      const business = await this.prisma.business.findUnique({
        where: {
          id: user.businessId,
        },
        include: {
          bankAccount: true,
        },
      });

      if (!business) {
        return {
          success: false,
          msg: 'This user does not have a business',
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

        if (response.data.message.includes('Could not resolve account name')) {
          return {
            success: false,
            msg: 'Invalid Bank Account. please check the account number and try again',
            data: null,
          };
        }
      }

      let bankAccount = null;

      if (!business.bankAccount) {
        bankAccount = await this.prisma.bankAccount.create({
          data: {
            bankSlug: addBankAccountDto.bankSlug,
            number: addBankAccountDto.number,
            businessId: business.id,
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
            businessId: business.id,
          },
          data: {
            bankSlug: addBankAccountDto.bankSlug,
            number: addBankAccountDto.number,
            accountName: data?.account_name,
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
        `Error adding bank account for business with id ${user.businessId}`,
        error,
      );

      return {
        success: false,
        msg: 'There was a problem adding the account',
        data: null,
      };
    }
  }

  async createStation(
    createStationDto: CreateStationDto,
    businessId: string,
  ): Promise<CustomResponse> {
    try {
      if (!businessId) {
        return {
          success: false,
          msg: 'Please create a business to continue',
          data: {},
        };
      }

      const pinHash = await argon.hash(createStationDto.pin);
      const { name, type, amountIsFixed, amount } = createStationDto;
      let station = await this.prisma.station.create({
        data: {
          name,
          type,
          amountIsFixed,
          amount,
          businessId,
          pinHash,
        },
      });

      station = ExcludeFieldsHelper.safeObject(station, ['pinHash']);

      return {
        success: true,
        msg: 'Station created successfully',
        data: station,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create station with name [${createStationDto.name}]`,
        error,
      );

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
        msg: 'Failed to create station',
        data: null,
      };
    }
  }

  async updateStation(
    updateStationDto: UpdateStationDto,
    businessId: string,
  ): Promise<CustomResponse> {
    try {
      const { id, newPin, currentPin, name, type, amount, amountIsFixed } =
        updateStationDto;
      let station = await this.prisma.station.findUnique({
        where: {
          id,
          businessId,
        },
      });

      if (!station) {
        return {
          success: false,
          msg: 'Station not found',
          data: null,
        };
      }

      let pinHash = undefined;
      if (newPin) {
        if (!currentPin) {
          return {
            success: false,
            msg: 'Current pin must be provided to change pin',
            data: null,
          };
        }

        if (newPin === currentPin) {
          return {
            success: false,
            msg: 'Your new pin and current pin cannot be the same',
            data: null,
          };
        }

        const pinMatches = await argon.verify(station.pinHash, currentPin);

        if (!pinMatches) {
          return {
            success: false,
            msg: 'Invalid current pin',
            data: null,
          };
        }

        pinHash = await argon.hash(newPin);
      }

      const updatedStation = await this.prisma.station.update({
        where: {
          id: id,
        },
        data: {
          name,
          type,
          amountIsFixed,
          amount,
          pinHash,
        },
      });

      station = ExcludeFieldsHelper.safeObject(updatedStation, ['pinHash']);

      return {
        success: true,
        msg: 'Station updated successfully',
        data: station,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update station with id [${updateStationDto.id}]`,
        error,
      );

      console.log(error);

      return {
        success: false,
        msg: 'Failed to update station',
        data: null,
      };
    }
  }

  async getStations(
    getStationsDto: GetStationsDto,
    user: User,
  ): Promise<CustomResponse> {
    try {
      const stations = await this.prisma.station.findMany({
        take: getStationsDto.take,
        skip: getStationsDto.start,
        where: {
          businessId: user.businessId,
        },
        select: {
          id: true,
          name: true,
          active: true,
          lastLogin: true,
          refreshToken: true,
          roles: true,
          businessId: true,
          type: true,
          amount: true,
          amountIsFixed: true,
        },
      });

      return {
        success: true,
        msg: 'Stations retrieved successfully',
        data: stations,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stations for business with id [${user.businessId}]`,
        error,
      );

      return {
        success: false,
        msg: 'Failed to get stations',
        data: null,
      };
    }
  }

  async deleteStations(user: User, stationId: string) {
    try {
      const station = await this.prisma.station.findUnique({
        where: {
          id: stationId,
        },
      });

      if (station.businessId !== user.businessId) {
        return {
          success: false,
          msg: 'Station not found',
          data: null,
        };
      }

      await this.prisma.station.delete({
        where: {
          id: stationId,
        },
      });

      return {
        success: true,
        msg: 'Successfully deleted station',
        data: null,
      };
    } catch (error) {
      this.logger.error(
        `Error while deleting station [${stationId}]`,
        JSON.stringify(error, null, 2),
      );

      return {
        success: false,
        msg: 'Failed to delete station',
        data: null,
      };
    }
  }

  async changeStationPassword(
    changePasswordDto: ChangeStationPasswordDto,
  ): Promise<CustomResponse> {
    try {
      const station = await this.prisma.station.findUnique({
        where: {
          id: changePasswordDto.stationId,
        },
      });

      const passMatches = await argon.verify(
        station.pinHash,
        changePasswordDto.oldPassword,
      );

      if (!passMatches) {
        return {
          success: false,
          msg: 'incorrect old password',
          data: null,
        };
      }

      const hash = await argon.hash(changePasswordDto.newPassword);

      await this.prisma.station.update({
        data: {
          pinHash: hash,
        },
        where: {
          id: station.id,
        },
      });

      return {
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

  async initStationPasswordReset(user: User): Promise<CustomResponse> {
    try {
      const generatedOtp = await this.otpHelper.generateOtp(
        user.id,
        OTPEnum.PASSWORD_RESET,
        user.email,
      );

      this.emailHelper.sendPasswordResetEmail(user, generatedOtp);

      return <CustomResponse>{
        success: true,
        msg: 'Password reset email sent',
        data: null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialise password reset for station with`,
        JSON.stringify(error, null, 2),
      );

      if (error.code === 'P2003') {
        const fieldName = error.meta['field_name'].split('_')[1];
        console.log(fieldName);
        return {
          success: false,
          msg: `${fieldName}  does not exist`,
          data: null,
        };
      }

      return {
        success: false,
        msg: 'Failed to send password reset email',
        data: null,
      };
    }
  }

  async completeStationPasswordReset(
    completePasswordResetDto: CompleteStationPasswordResetDto,
  ): Promise<CustomResponse> {
    try {
      const station = await this.prisma.station.findUnique({
        where: {
          id: completePasswordResetDto.stationId,
        },
      });

      if (!station)
        return {
          success: false,
          msg: 'Invalid station ID',
          data: null,
        };

      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        completePasswordResetDto.token,
        OTPEnum.PASSWORD_RESET,
      );

      if (!verified.valid) {
        return {
          success: false,
          msg: verified.msg,
          data: null,
        };
      }

      const hash = await argon.hash(completePasswordResetDto.password);

      await this.prisma.station.update({
        data: {
          pinHash: hash,
        },
        where: {
          id: completePasswordResetDto.stationId,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Password reset successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error(
        `Error completing password reset for station with ID [${completePasswordResetDto.stationId}]`,
        JSON.stringify(error, null, 2),
      );

      return {
        success: false,
        msg: 'Failed to reset password',
        data: null,
      };
    }
  }
  /* TODO:
    activate station
    deactivate station
    download list of stations
*/
}
