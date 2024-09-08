/* eslint-disable @typescript-eslint/no-var-requires */
import {
  BadRequestException,
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AddBankDto,
  DeactivateUserDto,
  GetDashboardDataDto,
  UpdateBankDto,
  UpdateCollectionDurationDto,
  UpdatePaymentProcessorDto,
  UpdateStaffDto,
} from './dto';
import { Role } from '@prisma/client';
import { CustomResponse } from 'src/common/types';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import * as AWS from 'aws-sdk';
import * as argon from 'argon2';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailService } from 'src/email/email.service';
import { EmailBody } from 'src/email/dto';

@Injectable()
export class AdminService {
  logger = new Logger(AdminService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async getDashboardData(
    getDashboardDataDto: GetDashboardDataDto,
  ): Promise<CustomResponse> {
    try {
      const totalCustomers = await this.prisma.user.count({
        where: {
          active: getDashboardDataDto.active,
          createdAt: {
            lte: getDashboardDataDto.toDate,
            gte: getDashboardDataDto.fromDate,
          },

          roles: {
            has: Role.CUSTOMER,
          },
        },
      });

      const totalMerchants = await this.prisma.user.count({
        where: {
          active: getDashboardDataDto.active,
          createdAt: {
            lte: getDashboardDataDto.toDate,
            gte: getDashboardDataDto.fromDate,
          },

          roles: {
            has: Role.MERCHANT,
          },
        },
      });

      const totalAdmin = await this.prisma.user.count({
        where: {
          active: getDashboardDataDto.active,
          createdAt: {
            lte: getDashboardDataDto.toDate,
            gte: getDashboardDataDto.fromDate,
          },
          OR: [
            {
              roles: {
                has: Role.ADMIN,
              },
            },
            {
              roles: {
                has: Role.SUPER_ADMIN,
              },
            },
          ],
        },
      });

      const totalTransactions = await this.prisma.transaction.count({
        where: {
          createdAt: {
            lte: getDashboardDataDto.toDate,
            gte: getDashboardDataDto.fromDate,
          },
        },
      });

      const totalTransactionsAmount = (
        await this.prisma.transaction.aggregate({
          where: {
            createdAt: {
              lte: getDashboardDataDto.toDate,
              gte: getDashboardDataDto.fromDate,
            },
          },
          _sum: {
            amount: true,
          },
        })
      )._sum.amount;

      const totalNumberOfLogins = await this.prisma.user.count({
        where: {
          lastLogin: {
            lte: getDashboardDataDto.toDate,
            gte: getDashboardDataDto.fromDate,
          },
        },
      });

      return <CustomResponse>{
        success: false,
        msg: 'Successfully retrieved dashboard data',
        data: {
          totalAdmin,
          totalCustomers,
          totalMerchants,
          totalTransactions,
          totalTransactionsAmount,
          totalNumberOfLogins,
        },
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to retrieve dashboard data',
        data: null,
      });
    }
  }

  async uploadBanks(file: Express.Multer.File) {
    try {
      const banksJSON = JSON.parse(file.buffer.toString('ascii'));
      const banksArray = [];

      for (let i = 0; i < banksJSON.length; i++) {
        const logo = `${this.config.get(
          'DIGITAL_OCEAN_SPACES_BASE_URL',
        )}/nigerian-banks-logos/${banksJSON[i]['slug']}.png`;
        try {
          const bank = await this.prisma.bank.create({
            data: {
              name: banksJSON[i]['name'],
              code: banksJSON[i]['code'],
              slug: banksJSON[i]['slug'],
              ussd: banksJSON[i]['ussd'],
              logo: logo,
            },
          });

          banksArray.push(bank);
        } catch (error) {
          if (error.code === 'P2002') {
            const bank = await this.prisma.bank.update({
              where: {
                slug: banksJSON[i]['slug'],
              },
              data: {
                name: banksJSON[i]['name'],
                code: banksJSON[i]['code'],
                slug: banksJSON[i]['slug'],
                ussd: banksJSON[i]['ussd'],
                logo: logo,
              },
            });

            banksArray.push(bank);
          } else {
            console.log(error);
          }
        }
      }

      await this.cacheManager.set('banks', banksArray);

      return banksArray;
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

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An error occured when uploading banks',
        data: null,
      });
    }
  }

  async addBank(addBankDto: AddBankDto, logo: Express.Multer.File) {
    try {
      const spacesEndpoint = new AWS.Endpoint(
        this.config.get('DO_SPACES_ENDPOINT'),
      );
      const s3 = new AWS.S3({
        endpoint: spacesEndpoint,
        accessKeyId: this.config.get('DO_SPACES_KEY'),
        secretAccessKey: this.config.get('DO_SPACES_SECRET'),
      });

      // multer.diskStorage({
      //   destination: path.join(__dirname, '..', '..', '/static/images/banks'),
      //   filename: function () {
      //     `${addBankDto.name}${path.extname(logo.originalname)}`;
      //   },
      // });

      // console.log(`${addBankDto.name}${path.extname(logo.originalname)}`);

      let logoPath = `${this.config.get(
        'DIGITAL_OCEAN_SPACES_BASE_URL',
      )}/nigerian-banks-logos/default-image.png`;

      await s3
        .upload({
          Bucket: `${this.config.get('DO_SPACES_NAME')}/nigerian-banks-logos`,
          Key: `${addBankDto.slug}.png`,
          Body: logo.buffer,
          ACL: 'public-read',
        })
        .promise()
        .then((data: any) => {
          logoPath = `${this.config.get(
            'DIGITAL_OCEAN_SPACES_BASE_URL',
          )}/nigerian-banks-logos/${addBankDto.slug}.png`;

          console.log('Your file has been uploaded successfully!', data);
        })
        .catch((error: any) => {
          console.log(error);
          throw new Error('Failed to upload logo');
        });

      const bank = await this.prisma.bank.create({
        data: {
          ...addBankDto,
          logo: logoPath,
        },
      });

      const banks = await this.prisma.bank.findMany();

      await this.cacheManager.set('banks', banks);

      return <CustomResponse>{
        success: true,
        msg: 'Successfully added bank',
        data: { bank },
      };
    } catch (error) {
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

      if (typeof error.status === 'number') {
        throw error;
      }

      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An error occured when uploading banks',
        data: null,
      });
    }
  }

  async updateBank(updateBankDto: UpdateBankDto, logo?: Express.Multer.File) {
    try {
      let logoPath = `${this.config.get(
        'DIGITAL_OCEAN_SPACES_BASE_URL',
      )}/nigerian-banks-logos/default-image.png`;

      if (logo) {
        const spacesEndpoint = new AWS.Endpoint(
          this.config.get('DO_SPACES_ENDPOINT'),
        );
        const s3 = new AWS.S3({
          endpoint: spacesEndpoint,
          accessKeyId: this.config.get('DO_SPACES_KEY'),
          secretAccessKey: this.config.get('DO_SPACES_SECRET'),
        });

        await s3
          .upload({
            Bucket: `${this.config.get('DO_SPACES_NAME')}/nigerian-banks-logos`,
            Key: `${updateBankDto.slug}.png`,
            Body: logo.buffer,
            ACL: 'public-read',
          })
          .promise()
          .then((data: any) => {
            logoPath = `${this.config.get(
              'DIGITAL_OCEAN_SPACES_BASE_URL',
            )}/nigerian-banks-logos/${updateBankDto.slug}.png`;

            console.log('Your file has been uploaded successfully!', data);
          })
          .catch((error: any) => {
            console.log(error);
            throw new Error('Failed to upload logo');
          });
      }

      const bank = await this.prisma.bank.update({
        where: {
          slug: updateBankDto.slug,
        },
        data: {
          ...updateBankDto,
          logo: logo ? logoPath : undefined,
        },
      });

      const banks = await this.prisma.bank.findMany();

      await this.cacheManager.set('banks', banks);

      return <CustomResponse>{
        success: true,
        msg: 'Successfully added bank',
        data: { bank },
      };
    } catch (error) {
      if (typeof error.status === 'number') {
        throw error;
      }

      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'An error occured when uploading banks',
        data: null,
      });
    }
  }

  private async generatePin(pinLength: number) {
    const chars = '0123456789';

    let pin = '';

    for (let i = 0; i <= pinLength; i++) {
      const randomNumber = Math.floor(Math.random() * chars.length);
      pin += chars.substring(randomNumber, randomNumber + 1);
    }

    return pin;
  }

  private async generatePassword(passwordLength: number) {
    const chars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let password = '';

    for (let i = 0; i <= passwordLength; i++) {
      const randomNumber = Math.floor(Math.random() * chars.length);
      password += chars.substring(randomNumber, randomNumber + 1);
    }

    return password;
  }
  async registerStaff(payload: RegisterStaffDto): Promise<CustomResponse> {
    const {
      roles,
      firstName,
      email,
      lastName,
      username,
      phoneNumber,
      countryId,
    } = payload;
    try {
      const password = await this.generatePassword(12);
      const passwordHash = await argon.hash(password);

      roles as Role[];
      const staff = await this.prisma.user.create({
        data: {
          firstName,
          lastName,
          username,
          email,
          phoneNumber,
          phoneNumberVerified: true,
          roles,
          countryId,
          passwordHash,
          emailVerified: true,
        },
      });

      delete staff.hash;

      const content = {
        body: {
          title: 'StarkPay Staff Login Details',
          name: `Hi, ${firstName + ' ' + lastName}`,
          intro: [
            'Here are your StarkPay login details',
            `<h1 style="color:black;"><b>Password:</b> ${password}</h1>`,
            'Please change your password on login.',
          ],
          outro:
            "Need help, or have questions? Just reply to this email, we'd love to help.",
        },
      };

      const emailHtmlBody = mailGenerator.generate(content);

      const emailBody: EmailBody = {
        to: email,
        subject: 'StarkPay Staff Login Details',
        content: emailHtmlBody,
      };

      this.emailService.sendEmail(emailBody);

      return <CustomResponse>{
        success: true,
        msg: `You have successfully registered ${firstName} ${lastName} as a staff`,
        data: { staff },
      };
    } catch (error) {
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

      throw new BadRequestException({
        success: false,
        msg: 'Error registering staff',
        data: null,
      });
    }
  }

  async updateStaffRoles(payload: UpdateStaffDto): Promise<CustomResponse> {
    const { roles, id } = payload;
    try {
      roles as Role[];
      const staff = await this.prisma.user.update({
        where: {
          id,
        },
        data: {
          roles,
        },
      });
      const { firstName, lastName, email } = staff;

      delete staff.hash;

      const content = {
        body: {
          title: 'Updated Roles',
          name: `Hi, ${firstName + ' ' + lastName}`,
          intro: [
            'Your roles have been updated. Please see new roles below.',
            `<h1 style="color:black;"><b>Roles:</b> ${roles}</h1>`,
            'Please change your password on login.',
          ],
          outro:
            "Need help, or have questions? Just reply to this email, we'd love to help.",
        },
      };

      const emailHtmlBody = mailGenerator.generate(content);

      const emailBody: EmailBody = {
        to: email,
        subject: 'StarkPay Roles Updated',
        content: emailHtmlBody,
      };

      this.emailService.sendEmail(emailBody);

      return <CustomResponse>{
        success: true,
        msg: `You have successfully updated the staff's roles`,
        data: {},
      };
    } catch (error) {
      this.logger.error(`Failed to update staff's roles`);

      console.log(error);
      if (error.code === 'P2002') {
        throw new BadRequestException({
          success: false,
          msg: 'Credentials taken',
          data: null,
        });
      }

      throw new BadRequestException({
        success: false,
        msg: 'Error registering staff',
        data: null,
      });
    }
  }

  async activateUser(userId: string): Promise<CustomResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return <CustomResponse>{
          success: false,
          msg: 'User not found',
          data: null,
        };
      }

      const updatedUser = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          active: true,
        },
      });

      const email = {
        body: {
          title: 'Account Activation',
          name: `${user.firstName}`,
          intro: [
            'Your account has been reinstated.',
            `You can now resume making transactions. Thank you for your patience.`,
          ],
          outro:
            "Need help, or have questions? Just reply to this email, we'd love to help.",
        },
      };

      const emailHtmlBody = mailGenerator.generate(email);

      const emailBody: EmailBody = {
        to: user.email,
        subject: 'StarkPay Account Activated',
        content: emailHtmlBody,
      };

      this.emailService.sendEmail(emailBody);

      return <CustomResponse>{
        success: true,
        msg: 'Account reinstated successfully',
        data: { user: updatedUser },
      };
    } catch (error) {
      this.logger.error(
        'ERROR activating user',
        JSON.stringify(error, null, 2),
      );

      return <CustomResponse>{
        success: false,
        msg: 'Failed to reinstate account',
      };
    }
  }

  async deactivateUser(
    deactivateUserDto: DeactivateUserDto,
  ): Promise<CustomResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: deactivateUserDto.userId,
        },
      });

      if (!user) {
        return <CustomResponse>{
          success: false,
          msg: 'User not found',
          data: null,
        };
      }

      const updatedUser = await this.prisma.user.update({
        where: {
          id: deactivateUserDto.userId,
        },
        data: {
          active: false,
        },
      });

      let email: object;
      if (deactivateUserDto.permanent) {
        email = {
          body: {
            title: 'Account Deactivation',
            name: `${user.firstName}`,
            intro: [
              'Your account has been permanently deactivated for the follwing reason:',
              `<p style="color:gray;">${deactivateUserDto.reason}</p>`,
            ],
            outro:
              "Need help, or have questions? Just reply to this email, we'd love to help.",
          },
        };
      } else {
        email = {
          body: {
            title: 'Account Deactivation',
            name: `${user.firstName}`,
            intro: [
              'Your account has been temporarily deactivated for the following reason:',
              `<ul><li style="color:DimGray;">${deactivateUserDto.reason}</li></ul>`,
              'In order to request reactivation, please contact support',
            ],
            outro:
              "Need help, or have questions? Just reply to this email, we'd love to help.",
          },
        };
      }

      const emailHtmlBody = mailGenerator.generate(email);

      const emailBody: EmailBody = {
        to: user.email,
        subject: 'StarkPay Account Deactivated',
        content: emailHtmlBody,
      };

      this.emailService.sendEmail(emailBody);

      return <CustomResponse>{
        success: true,
        msg: 'Account deactivated successfully',
        data: { user: updatedUser },
      };
    } catch (error) {
      this.logger.error(
        'Error while deactivating user',
        JSON.stringify(error, null, 2),
      );
    }

    return <CustomResponse>{
      success: false,
      msg: 'Failed to deactivate account',
      data: null,
    };
  }

  async updatePaymentProcessor(
    dto: UpdatePaymentProcessorDto,
  ): Promise<CustomResponse> {
    try {
      const configTable = await this.prisma.configuration.findFirst();

      await this.prisma.configuration.update({
        where: {
          id: configTable.id,
        },
        data: {
          paymentProcessor: dto.processor,
        },
      });

      return {
        success: true,
        msg: `Updated successfully`,
        data: null,
      };
    } catch (error) {
      this.logger.error('Error while updating payment processor');
      console.log(error);

      return <CustomResponse>{
        success: false,
        msg: 'Failed to update processor',
        data: null,
      };
    }
  }
  async updateCollectionDuration(
    dto: UpdateCollectionDurationDto,
  ): Promise<CustomResponse> {
    try {
      const { duration } = dto;

      const configTable = await this.prisma.configuration.findFirst();

      const { collectionDurationInSeconds } =
        await this.prisma.configuration.update({
          where: {
            id: configTable.id,
          },
          data: {
            collectionDurationInSeconds: duration,
          },
        });

      return {
        success: true,
        msg: `Duration collection updated`,
        data: { duration: collectionDurationInSeconds },
      };
    } catch (error) {
      this.logger.error(`Error updating duration`);

      console.log(error);

      return {
        success: false,
        msg: `Failed to update duration`,
        data: {},
      };
    }
  }
}
