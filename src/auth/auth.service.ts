import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import { SignUpDto } from './dto/sign-up.dto';
import * as argon from 'argon2';
import * as speakeasy from 'speakeasy';
import 'qrcode';
import {
  BiometricAuthHelper,
  JwtHelper,
  SendEmailHelper,
  TwoFactorAuthentication,
} from './helpers';
import {
  ResetPasswordDto,
  ResetPinDto,
  PasswordAuthDto,
  InitPasswordResetDto,
  ResendOtpDto,
  StationAuthDto,
} from './dto';
import { ConfigService } from '@nestjs/config';
import { TokenType, TwoFactorAuthTypes } from './types';
import { EnableTwoFactorAuthDto, TwoFactorAuthForAppDto } from './dto';
import { CustomResponse, OTPEnum, verifyOtpResponse } from '../common/types';
import { ExcludeFieldsHelper, OtpHelper } from '../common/helpers';
import { Role, Station, User, UserAction } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { SmsService } from 'src/sms/sms.service';
import { EmailService } from 'src/email/email.service';
import { mailGenerator } from 'src/email/mailgen/config';
import { EmailBody } from 'src/email/types';
import { WalletService } from 'src/wallet/wallet.service';
import { CardService } from 'src/card/card.service';
import { ReferralCodeValidatedEvent } from './events';
import { DiscordService } from 'src/discord/discord.service';

@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private emailHelper: SendEmailHelper,
    private jwtHelper: JwtHelper,
    private config: ConfigService,
    private readonly jwtService: JwtService,
    private otpHelper: OtpHelper,
    public twoFactorAuth: TwoFactorAuthentication,
    private biometricAuthHelper: BiometricAuthHelper,
    private excludeFieldsHelper: ExcludeFieldsHelper,
    private smsService: SmsService,
    private emailService: EmailService,
    private walletService: WalletService,
    private cardService: CardService,
    private referralCodeValidatedEvent: ReferralCodeValidatedEvent,
    private discordService: DiscordService,
  ) {}

  private async generateUsername(firstName: string): Promise<string> {
    try {
      let generatedUsername: string;
      const usersWithUsername = await this.prisma.user.findMany({
        where: {
          username: {
            startsWith: firstName,
            mode: 'insensitive',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (usersWithUsername.length > 0) {
        const lastUsernameNumber = parseInt(
          usersWithUsername[0].username.split('_')[1],
        );

        if (lastUsernameNumber) {
          generatedUsername = `${firstName.toLowerCase()}_${
            lastUsernameNumber + 1
          }`;
        } else {
          generatedUsername = `${firstName.toLowerCase()}_${1}`;
        }
      } else {
        generatedUsername = firstName.toLowerCase();
      }

      return generatedUsername;
    } catch (error) {
      throw new Error('Failed to generate username');
    }
  }

  async signUp(payload: SignUpDto, useSMS = false): Promise<CustomResponse> {
    let { username } = payload;
    const {
      password,
      firstName,
      lastName,
      countryId,
      email,
      role,
      phoneNumber,
      pin,
      nfcCardNumber,
      referralCode,
    } = payload;
    try {
      const hash = pin ? await argon.hash(pin) : null;
      const passwordHash =
        password && role === Role.BUSINESS ? await argon.hash(password) : null;

      if (!username) {
        username = await this.generateUsername(firstName);
      }

      const user = await this.prisma.user.create({
        data: {
          firstName,
          lastName,
          username,
          countryId,
          roles: [role],
          email,
          phoneNumber,
          hash,
          passwordHash,
        },
      });

      const wallet = await this.walletService.createWallet(user.id);

      if (nfcCardNumber) {
        await this.cardService.addNFCCard(
          user.id,
          { id: user.id, wallets: [wallet] },
          {
            nfcCardNumber,
            walletId: wallet.id,
            name: username,
          },
        );
      }

      const generatedOtp = await this.otpHelper.generateOtp(
        user.id,
        OTPEnum.EMAIL_VERIFICATION,
        user.email,
      );

      // SHOULD CHANGE TO BE CALLED WHEN THE REFERRED MAKES THEIR FIRST PAYMENT
      // USING THE APP
      if (referralCode) {
        this.referralCodeValidatedEvent.emitEvent({
          referralCode,
          userId: user.id,
        });
      }

      if (useSMS) {
        const smsBody = {
          to: phoneNumber,
          message: 'Your one-time pass is ' + generatedOtp,
        };

        await this.smsService.sendSMSPlusDND(smsBody);
      } else {
        this.emailHelper.sendWelcomeEmail(user);
        this.emailHelper.sendVerificationEmail(user, generatedOtp);
      }

      const accessToken = await this.jwtHelper.signToken(user.id, {
        phone: user.phoneNumber,
        type: TokenType.ACCESS,
      });

      // sends message to discord server
      this.discordService.sendToDiscord({
        link: 'https://discord.com/api/webhooks/1144617592733040720/qhMG7pdS0171xweglYWyoHAgcijyhWPyWZQdoYLslRBsX4z04-Vx1ZURaylKp-DXi1XT',
        author: `${username}`,
        message: `${username} just signed up and is yet to verify their email address`,
        title: `Welcome our new member [${role}]!`,
      });

      return <CustomResponse>{
        success: true,
        msg: 'Sign up successful, check your email for verification email',
        data: { userId: user.id, accessToken: accessToken.token },
      };
    } catch (error) {
      this.logger.error('error while creating user');
      console.log(error);

      // sends message to discord server
      this.discordService.sendToDiscord({
        link: this.config.get('DISCORD_ERROR_URL'),
        author: `Auth Module`,
        message: `Error when user with email [${email}] signed up`,
        title: `Sign Up Error`,
      });

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
        msg: 'An error occurred while creating the user',
        data: null,
      };
    }
  }

  async registerUser(
    signUpDto: SignUpDto,
    agentId: string,
  ): Promise<CustomResponse> {
    try {
      if (signUpDto.role !== Role.CUSTOMER) {
        return {
          success: false,
          msg: 'Invalid role option',
          data: null,
        };
      }

      const response = await this.signUp(signUpDto, true);

      if (response.success) {
        const data: any = response.data;

        await this.prisma.userHistory.create({
          data: {
            createdById: agentId,
            userId: data.user.id,
            action: UserAction.CREATE,
          },
        });
      }

      return response;
    } catch (error) {
      this.logger.error(
        'Error registering user',
        JSON.stringify(error, null, 2),
      );

      this.discordService.sendToDiscord({
        link: this.config.get('DISCORD_ERROR_URL'),
        author: `Auth Module`,
        message: `Error while agent was registering user with email [${signUpDto.email}]`,
        title: `Registration Error`,
      });

      return {
        success: false,
        msg: 'Failed to register user',
        data: null,
      };
    }
  }
  private async checkRoles(user: User, appRole: Role): Promise<boolean> {
    if (!user.roles.includes(appRole)) {
      if (
        (appRole === Role.CUSTOMER || appRole === Role.MERCHANT) &&
        (user.roles.includes(Role.CUSTOMER) ||
          user.roles.includes(Role.MERCHANT))
      ) {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            roles: {
              push: appRole,
            },
          },
        });

        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  private async loginGuard(user: User): Promise<number> {
    try {
      const currentTime = new Date();
      const lastLoginAttemptTime = new Date(user.lastLoginAttempt);
      const timeDifferenceInMinutes =
        (currentTime.getTime() - lastLoginAttemptTime.getTime()) / (1000 * 60);

      if (
        user.numberOfSequentialLoginAttempts >= 5 &&
        timeDifferenceInMinutes < 10
      ) {
        // Calculate the time left in minutes
        const timeLeft = 10 - timeDifferenceInMinutes;
        return timeLeft;
      } else {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            numberOfSequentialLoginAttempts: {
              increment: 1,
            },
            lastLoginAttempt: new Date(),
          },
        });
        return 0; // User is allowed to attempt logging in again
      }
    } catch (error) {
      this.logger.error(`Error checking the number of user login attempts`);

      console.log(error);

      return 1;
    }
  }

  async pinSignIn(authDto: AuthDto, appRole: Role): Promise<CustomResponse> {
    try {
      if (!authDto.pin && !authDto.deviceId) {
        throw new ForbiddenException({
          success: false,
          msg: 'Please enter your email address and pin',
          data: null,
        });
      }

      let user: User;

      if (authDto.email) {
        user = await this.prisma.user.findUnique({
          where: {
            email: authDto.email,
          },
        });
      } else {
        user = await this.prisma.user.findUnique({
          where: {
            phoneNumber: authDto.phoneNumber,
          },
        });
      }

      if (!user)
        throw new ForbiddenException({
          success: false,
          msg: 'No such user',
          data: null,
        });

      if (!user.active)
        return {
          success: false,
          msg: 'Your account has been deactivated',
          data: null,
        };

      // validate role of the user
      const validRole = await this.checkRoles(user, appRole);

      if (!validRole) {
        throw new ForbiddenException({
          success: false,
          msg: 'No such user',
          data: null,
        });
      }

      const tooManyLoginAttempts = await this.loginGuard(user); // returns the number of minutes left till user can attempt next login if they have tried up to 5 times in the past 10 minutes and have gotten it wrong, if not it returns 0;
      if (tooManyLoginAttempts > 0) {
        throw new ForbiddenException({
          success: false,
          msg: `Due to too many failed login attempts, you have to wait and try again in ${Math.round(
            tooManyLoginAttempts,
          )} minutes.`,
          data: null,
        });
      } else if (
        tooManyLoginAttempts <= 0 &&
        user.numberOfSequentialLoginAttempts >= 5
      ) {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            numberOfSequentialLoginAttempts: 0,
          },
        });
      }

      if (authDto.pin) {
        const passMatches = await argon.verify(user.hash, authDto.pin);

        if (!passMatches) {
          const tooManyLoginAttempts = await this.loginGuard(user);

          if (tooManyLoginAttempts > 0) {
            throw new ForbiddenException({
              success: false,
              msg: 'Too many failed login attempts, please try again in 10 minutes.',
              data: null,
            });
          } else {
            throw new ForbiddenException({
              success: false,
              msg: 'Incorrect pin',
              data: null,
            });
          }
        }
      } else if (authDto.deviceId) {
        if (!user)
          throw new ForbiddenException({
            success: false,
            msg: 'invalid device ID',
            data: null,
          });

        const deviceIdMatches = await argon.verify(
          user.biometricSecret,
          authDto.deviceId,
        );

        // for (let i = 0; user.biometricSecrets.length > 0; i++) {
        //   deviceIdMatches = await argon.verify(
        //     user.biometricSecrets[0],
        //     authDto.deviceId,
        //   );

        //   if (deviceIdMatches) {
        //     break;
        //   }
        // }

        if (!deviceIdMatches)
          throw new ForbiddenException({
            success: false,
            msg: 'Invalid Device ID',
            data: null,
          });
      }

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      // handle 2FA
      if (user.twoFactorEnabled) {
        if (user.twoFactorAuthType === TwoFactorAuthTypes.EMAIL_OTP) {
          this.twoFactorAuth.verifyWithOtp(user);

          return <CustomResponse>{
            success: true,
            msg: 'An OTP has been sent to your email',
            data: { user: safeUser },
          };
        } else if (user.twoFactorAuthType === TwoFactorAuthTypes.AUTH_APP) {
          return <CustomResponse>{
            success: true,
            msg: 'Enter your token',
            data: { user: safeUser },
          };
        }
      }

      const tokens = await this.jwtHelper.signToken(user.id, {
        phone: user.phoneNumber,
        type: TokenType.ACCESS,
      });

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLogin: new Date(),
          numberOfSequentialLoginAttempts: 0,
        },
      });

      // handle first login
      if (authDto.firstLogin) {
        const deviceId = await this.biometricAuthHelper.generateDeviceId(
          user.id,
        );

        this.logger.log(`updating refresh...`);
        await this.updateRefreshToken(tokens.refreshToken, user.id);

        return <CustomResponse>{
          success: true,
          msg: 'You have signed in successfully',
          data: {
            user: safeUser,
            accessToken: tokens.token,
            refreshToken: tokens.refreshToken,
            deviceId: deviceId,
          },
        };
      }

      this.logger.log(`updating refresh...`);
      await this.updateRefreshToken(tokens.refreshToken, user.id);

      this.emailHelper.sendLoginConfirmationEmail(user);

      return <CustomResponse>{
        success: true,
        msg: 'You have signed in successfully',
        data: {
          user: safeUser,
          accessToken: tokens.token,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to sign in',
        data: null,
      });
    }
  }

  async signInStation(stationAuthDto: StationAuthDto): Promise<CustomResponse> {
    try {
      const station = await this.prisma.station.findUnique({
        where: {
          name: stationAuthDto.name,
        },
      });

      if (!station)
        return {
          success: false,
          msg: 'No such station',
          data: null,
        };

      if (!station.active)
        return {
          success: false,
          msg: 'Your account has been deactivated',
          data: null,
        };

      const passMatches = await argon.verify(
        station.pinHash,
        stationAuthDto.pin,
      );

      if (!passMatches)
        return {
          success: false,
          msg: 'Incorrect pin',
          data: null,
        };

      const tokens = await this.jwtHelper.signToken(station.id, {
        type: TokenType.ACCESS,
      });

      await this.prisma.station.update({
        where: {
          id: station.id,
        },
        data: {
          lastLogin: new Date(),
        },
      });

      this.logger.log(`updating refresh [Station Sign In]...`);
      await this.updateRefreshToken(tokens.refreshToken, null, station.id);

      return <CustomResponse>{
        success: true,
        msg: 'You have signed in successfully',
        data: {
          station: ExcludeFieldsHelper.safeObject(station, ['pinHash']),
          accessToken: tokens.token,
          refreshToken: tokens.refreshToken,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to sign in to station with name [${stationAuthDto.name}]:`,
        error,
      );

      console.log(error);

      return {
        success: false,
        msg: `Failed to sign in to station`,
        data: null,
      };
    }
  }

  async updateRefreshToken(
    refreshToken: string,
    userId?: string,
    stationId?: string,
  ) {
    const hashedRefreshToken = await argon.hash(refreshToken);

    if (userId)
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          refreshToken: hashedRefreshToken,
        },
      });
    else if (stationId)
      await this.prisma.station.update({
        where: {
          id: stationId,
        },
        data: {
          refreshToken: hashedRefreshToken,
        },
      });
  }

  async refreshTokens(
    refreshToken: string,
    user?: User,
    station?: Station,
  ): Promise<CustomResponse> {
    try {
      if (user) {
        // console.log('REFRESH TOKEN', refreshToken);
        // console.log('USER REFRESH TOKEN', user.refreshToken);

        const refreshTokenMatches = await argon.verify(
          user.refreshToken,
          refreshToken,
        );

        if (!refreshTokenMatches) {
          return {
            success: false,
            msg: 'Access denied',
            data: null,
          };
        } else {
          const tokens = await this.jwtHelper.signToken(user.id, {
            phone: user.phoneNumber,
            type: TokenType.ACCESS,
          });

          await this.updateRefreshToken(tokens?.refreshToken, user.id);

          return {
            success: true,
            msg: `token refreshed successfully`,
            data: {
              accessToken: tokens.token,
              refreshToken: tokens.refreshToken,
            },
          };
        }
      } else if (station) {
        const refreshTokenMatches = await argon.verify(
          station.refreshToken,
          refreshToken,
        );

        if (!refreshTokenMatches) {
          return {
            success: false,
            msg: 'Access denied',
            data: null,
          };
        } else {
          const tokens = await this.jwtHelper.signToken(station.id, {
            type: TokenType.ACCESS,
          });

          await this.updateRefreshToken(tokens?.refreshToken, null, station.id);

          return {
            success: true,
            msg: `token refreshed successfully`,
            data: {
              accessToken: tokens.token,
              refreshToken: tokens.refreshToken,
            },
          };
        }
      }
    } catch (error) {
      this.logger.error(`error refreshing token: ` + JSON.stringify(error));

      console.log(error);

      return {
        success: false,
        msg: 'Failed to refresh tokens',
        data: null,
      };
    }
  }

  async adminSignIn(payload: PasswordAuthDto): Promise<CustomResponse> {
    const { password, email } = payload;
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

      // validate role of the user
      const { numberOfSequentialLoginAttempts, id, roles, passwordHash } = user;
      console.log(roles);
      if (
        !(
          user ||
          user.roles.includes(Role.ADMIN) ||
          !user.roles.includes(Role.SUPER_ADMIN) ||
          user.roles.includes(Role.SUPPORT)
        )
      ) {
        throw new ForbiddenException({
          success: false,
          msg: 'No such user',
          data: null,
        });
      }

      if (!passwordHash) {
        throw new BadRequestException({
          success: false,
          msg: 'Incorrect password',
          data: null,
        });
      }

      const tooManyLoginAttempts = await this.loginGuard(user); // returns the number of minutes left till user can attempt next login if they have tried up to 5 times in the past 10 minutes and have gotten it wrong, if not it returns 0;
      if (tooManyLoginAttempts > 0) {
        throw new ForbiddenException({
          success: false,
          msg: `Due to too many failed login attempts, you have to wait and try again in ${Math.round(
            tooManyLoginAttempts,
          )} minutes.`,
          data: null,
        });
      } else if (
        tooManyLoginAttempts <= 0 &&
        numberOfSequentialLoginAttempts >= 5
      ) {
        await this.prisma.user.update({
          where: {
            id,
          },
          data: {
            numberOfSequentialLoginAttempts: 0,
          },
        });
      }

      const passMatches = await argon.verify(passwordHash, password);

      if (!passMatches)
        throw new ForbiddenException({
          success: false,
          msg: 'Incorrect password',
          data: null,
        });

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      // handle 2FA
      if (user.twoFactorEnabled) {
        return <CustomResponse>{
          success: true,
          msg: 'Enter your token from you 2fa app',
          data: { user: safeUser },
        };
      } else {
        const response: any = await this.enableTwoFactorAuth(
          { twoFactorAuthType: TwoFactorAuthTypes.AUTH_APP },
          user,
        );

        if (response.success) {
          await this.emailHelper.send2FAInstructionsEmail(
            user,
            response.data.qrCode,
            response.data.url,
            response.data.base32,
          );
        } else {
          return <CustomResponse>{
            success: false,
            msg: 'An error occured. Please contact tech support',
            data: null,
          };
        }

        return <CustomResponse>{
          success: true,
          msg: 'Please check your email address for Instructions on how to complete your login',
          data: { userId: user.id },
        };
      }
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to sign in',
        data: null,
      });
    }
  }

  async passwordSignIn(
    payload: PasswordAuthDto,
    appRole: Role,
  ): Promise<CustomResponse> {
    const { password, email } = payload;
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

      const {
        id,
        roles,
        passwordHash,
        twoFactorEnabled,
        numberOfSequentialLoginAttempts,
      } = user;
      if (!user)
        throw new ForbiddenException({
          success: false,
          msg: 'No such user',
          data: null,
        });

      if (!roles.includes(appRole)) {
        return {
          success: false,
          msg: 'No such user',
          data: null,
        };
      }

      if (!passwordHash) {
        throw new BadRequestException({
          success: false,
          msg: 'Incorrect password',
          data: null,
        });
      }

      const tooManyLoginAttempts = await this.loginGuard(user); // returns the number of minutes left till user can attempt next login if they have tried up to 5 times in the past 10 minutes and have gotten it wrong, if not it returns 0;
      if (tooManyLoginAttempts > 0) {
        throw new ForbiddenException({
          success: false,
          msg: `Due to too many failed login attempts, you have to wait and try again in ${Math.round(
            tooManyLoginAttempts,
          )} minutes.`,
          data: null,
        });
      } else if (
        tooManyLoginAttempts <= 0 &&
        numberOfSequentialLoginAttempts >= 5
      ) {
        await this.prisma.user.update({
          where: {
            id,
          },
          data: {
            numberOfSequentialLoginAttempts: 0,
          },
        });
      }

      const passMatches = await argon.verify(passwordHash, password);

      if (!passMatches)
        throw new BadRequestException({
          success: false,
          msg: 'Incorrect password',
          data: null,
        });

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      // handle 2FA
      if (twoFactorEnabled) {
        return <CustomResponse>{
          success: true,
          msg: 'Enter your token from you 2fa app',
          data: { user: safeUser },
        };
      } else if (appRole === Role.BUSINESS) {
        const response: any = await this.enableTwoFactorAuth(
          { twoFactorAuthType: TwoFactorAuthTypes.AUTH_APP },
          user,
        );

        if (response.success) {
          await this.emailHelper.send2FAInstructionsEmail(
            user,
            response.data.qrCode,
            response.data.url,
            response.data.base32,
          );
        } else {
          return <CustomResponse>{
            success: false,
            msg: 'An error occurred. Please contact tech support',
            data: null,
          };
        }

        return <CustomResponse>{
          success: true,
          msg: 'Please check your email address for Instructions on how to complete your login',
          data: { userId: user.id },
        };
      } else {
        const tokens = await this.jwtHelper.signToken(user.id, {
          phone: user.phoneNumber,
          type: TokenType.ACCESS,
        });

        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            lastLogin: new Date(),
            numberOfSequentialLoginAttempts: 0,
          },
        });

        this.logger.log(`updating refresh...`);
        await this.updateRefreshToken(tokens.refreshToken, user.id);

        this.emailHelper.sendLoginConfirmationEmail(user);

        return <CustomResponse>{
          success: true,
          msg: 'You have signed in successfully',
          data: {
            user: safeUser,
            accessToken: tokens.token,
            refreshToken: tokens.refreshToken,
          },
        };
      }
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to sign in',
        data: null,
      });
    }
  }

  async enableTwoFactorAuth(
    enableTwoFactorAuthDto: EnableTwoFactorAuthDto,
    user: User,
  ): Promise<CustomResponse> {
    try {
      if (!user.twoFactorEnabled && !enableTwoFactorAuthDto.twoFactorAuthType) {
        return <CustomResponse>{
          success: false,
          msg: 'Authentication type not specified',
          data: null,
        };
      }

      if (user.twoFactorEnabled) {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorAuthType: null,
          },
        });

        return <CustomResponse>{
          success: true,
          msg: 'You have successfully deactivated two-factor authentication',
          data: null,
        };
      }

      if (
        enableTwoFactorAuthDto.twoFactorAuthType === TwoFactorAuthTypes.AUTH_APP
      ) {
        const secret = speakeasy.generateSecret({
          name: `StarkPay[${this.config.get('NODE_ENV')}]: ${user.email}`,
        });

        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            twoFactorSecret: secret.base32,
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const qrCode = require('qrcode');
        const dataUrl = await qrCode.toDataURL(secret.otpauth_url);

        return <CustomResponse>{
          success: true,
          msg: 'Please scan the QR code or Use the url',
          data: {
            qrCode: dataUrl,
            base32: secret.base32,
            url: secret.otpauth_url,
            userId: user.id,
          },
        };
      } else if (
        enableTwoFactorAuthDto.twoFactorAuthType ===
        TwoFactorAuthTypes.EMAIL_OTP
      ) {
        this.twoFactorAuth.verifyWithOtp(user);

        return <CustomResponse>{
          success: true,
          msg: 'An OTP has been sent to your email',
          data: null,
        };
      }
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to enable two factor authentication',
        data: null,
      });
    }
  }

  async completeTwoFactorAuthenticationWithApp(
    dto: TwoFactorAuthForAppDto,
  ): Promise<CustomResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: dto.userId,
        },
      });

      if (!user)
        throw new ForbiddenException({
          success: false,
          msg: 'No such user',
          data: null,
        });

      const verified: boolean = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: dto.token,
      });

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      if (verified) {
        const tokens = await this.jwtHelper.signToken(user.id, {
          phone: user.phoneNumber,
          type: TokenType.ACCESS,
        });

        this.logger.log(`updating refresh...`);
        await this.updateRefreshToken(tokens.refreshToken, user.id);

        await this.prisma.user.update({
          where: {
            id: dto.userId,
          },
          data: {
            twoFactorEnabled: true,
            twoFactorAuthType: TwoFactorAuthTypes.AUTH_APP,
          },
        });

        this.emailHelper.sendLoginConfirmationEmail(user);

        return <CustomResponse>{
          success: true,
          msg: 'You have signed in successfully',
          data: {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            user: safeUser,
          },
        };
      } else {
        return <CustomResponse>{
          success: false,
          msg: 'Sorry, invalid token',
          data: null,
        };
      }
    } catch (error) {
      console.error(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to complete two factor authentication',
        data: null,
      });
    }
  }

  async completeTwoFactorAuthenticationWithOtp(
    otpString: string,
  ): Promise<CustomResponse> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          otp: {
            startsWith: otpString,
          },
        },
      });

      const user = users[0];

      if (user === undefined) {
        throw new ForbiddenException({
          success: false,
          msg: 'Invalid otp',
          data: null,
        });
      }

      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        otpString,
        OTPEnum.TWO_FACTOR_AUTH,
      );

      const safeUser = await this.excludeFieldsHelper.safeUser(user);

      if (verified.valid) {
        const tokens = await this.jwtHelper.signToken(user.id, {
          phone: user.phoneNumber,
          type: TokenType.ACCESS,
        });

        this.logger.log(`updating refresh...`);
        await this.updateRefreshToken(tokens.refreshToken, user.id);

        await this.prisma.user.update({
          data: {
            otp: null,
            twoFactorEnabled: true,
            twoFactorAuthType: TwoFactorAuthTypes.EMAIL_OTP,
          },
          where: {
            id: user.id,
          },
        });

        this.emailHelper.sendLoginConfirmationEmail(user);

        return <CustomResponse>{
          success: true,
          msg: 'You have signed in successfully',
          data: {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            user: safeUser,
          },
        };
      } else {
        throw new ForbiddenException({
          success: false,
          msg: verified.msg,
          data: null,
        });
      }
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to complete two factor authentication',
        data: null,
      });
    }
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<CustomResponse> {
    try {
      if (resendOtpDto.phoneNumber) {
        const user = await this.prisma.user.findUnique({
          where: {
            phoneNumber: resendOtpDto.phoneNumber,
          },
        });

        console.log(resendOtpDto.phoneNumber);

        if (!user) {
          throw new ForbiddenException({
            success: false,
            msg: 'Invalid phone number',
            data: null,
          });
        }

        const generatedOtp = await this.otpHelper.generateOtp(
          user.id,
          OTPEnum.INITIAL_PHONE_VERIFICATION,
          user.email,
        );

        const smsBody = {
          to: user.phoneNumber,
          message: 'Your one-time pass is ' + generatedOtp,
        };

        await this.smsService.sendSMSPlusDND(smsBody);

        // REMOVE WHEN GOING LIVE

        const message = 'Use this OTP to verify your phone number: ';
        const title = 'Email Verification';

        const content = {
          body: {
            title: title,
            name: `Hi, ${user.firstName + ' ' + user.lastName}`,
            intro: [message, `<b><h1>${generatedOtp}</h1></b>`],
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

        return <CustomResponse>{
          success: true,
          msg: 'An OTP has been sent to your phone number',
          data: null,
        };
      } else if (resendOtpDto.email) {
        const user = await this.prisma.user.findUnique({
          where: {
            email: resendOtpDto.email,
          },
        });

        if (!user) {
          throw new ForbiddenException({
            success: false,
            msg: 'Invalid email address',
            data: null,
          });
        }

        const generatedOtp = await this.otpHelper.generateOtp(
          user.id,
          OTPEnum.EMAIL_VERIFICATION,
          user.email,
        );

        const message = 'Use this OTP to verify your email address: ';
        const title = 'Email Verification';

        const content = {
          body: {
            title: title,
            name: `Hi, ${user.firstName + ' ' + user.lastName}`,
            intro: [message, `<b><h1>${generatedOtp}</h1></b>`],
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

        return <CustomResponse>{
          success: true,
          msg: 'An OTP has been sent to your email',
          data: null,
        };
      }
    } catch (error) {
      console.log(error);

      if (typeof error.status === 'number') {
        throw error;
      }

      throw new ForbiddenException({
        success: false,
        msg: 'There was an error resending an otp. Please try again.',
        data: null,
      });
    }
  }

  async resendToken(user: any): Promise<CustomResponse> {
    try {
      this.twoFactorAuth.verifyWithOtp(user);

      return <CustomResponse>{
        success: true,
        msg: 'An OTP has been sent to your email',
        data: null,
      };
    } catch (error) {
      console.log(error);

      throw new ForbiddenException({
        success: false,
        msg: 'There was an error resending an otp. Please try again.',
        data: null,
      });
    }
  }

  async verifyPhoneNumber(otp: string) {
    try {
      const verified: verifyOtpResponse = await this.otpHelper.verifyOtp(
        otp,
        OTPEnum.INITIAL_PHONE_VERIFICATION,
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
          phoneNumberVerified: true,
        },
        where: {
          id: verified.user.id,
        },
        include: {
          wallets: true,
        },
      });

      // sends message to discord server
      this.discordService.sendToDiscord({
        link: 'https://discord.com/api/webhooks/1144617592733040720/qhMG7pdS0171xweglYWyoHAgcijyhWPyWZQdoYLslRBsX4z04-Vx1ZURaylKp-DXi1XT',
        author: `${user.username}`,
        message: `${user.username} ${user.roles} just verified their phone number`,
        title: `Someone verified their phone number!`,
      });

      return <CustomResponse>{
        success: true,
        msg: 'Phone number Verified',
        data: {},
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to verify phone number',
        data: null,
      });
    }
  }

  async verifyEmail(otp: string) {
    try {
      const { valid, msg, user }: verifyOtpResponse =
        await this.otpHelper.verifyOtp(otp, OTPEnum.EMAIL_VERIFICATION);

      if (!valid) {
        return {
          success: false,
          msg: msg,
          data: null,
        };
      }

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerified: true,
        },
        include: {
          wallets: true,
        },
      });

      return <CustomResponse>{
        success: true,
        msg: 'Email Verified',
        data: {},
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

  async initPinReset(payload: InitPasswordResetDto): Promise<CustomResponse> {
    const { email, phoneNumber } = payload;
    try {
      const user = email
        ? await this.prisma.user.findUnique({
            where: {
              email,
            },
          })
        : await this.prisma.user.findUnique({
            where: {
              phoneNumber,
            },
          });

      if (!user)
        return {
          success: false,
          msg: 'Invalid phone number or email address',
          data: null,
        };

      const generatedOtp = await this.otpHelper.generateOtp(
        user.id,
        OTPEnum.PASSWORD_RESET,
        user.email,
      );

      if (email) {
        this.emailHelper.sendPinResetEmail(user, generatedOtp);
      } else {
        const smsBody = {
          to: phoneNumber,
          message: 'Your one-time pass is ' + generatedOtp,
        };

        await this.smsService.sendSMSPlusDND(smsBody);
      }

      return <CustomResponse>{
        success: true,
        msg: email ? 'Pin reset email sent' : 'Pin reset sms sent',
        data: null,
      };
    } catch (error) {
      this.logger.error(`Failed to initiate pin reset`);
      console.log(error);

      if ((error.status = 403)) {
        throw error;
      }

      if (error.code === 'P2003') {
        const fieldName = error.meta['field_name'].split('_')[1];
        console.log(fieldName);
        throw new BadRequestException({
          success: false,
          msg: `${fieldName} ${payload[fieldName]} does not exist`,
          data: null,
        });
      }

      return {
        success: false,
        msg: 'Failed to send pin reset email',
        data: null,
      };
    }
  }

  async resetPin(payload: ResetPinDto): Promise<CustomResponse> {
    const { otp, pin } = payload;
    try {
      const { valid, msg, user } = await this.otpHelper.verifyOtp(
        otp,
        OTPEnum.PASSWORD_RESET,
      );

      if (!valid) {
        return {
          success: false,
          msg,
          data: null,
        };
      }

      const hash = await argon.hash(pin);

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
        msg: 'Pin reset',
        data: null,
      };
    } catch (error) {
      console.log(error);

      return {
        success: false,
        msg: 'Failed to reset pin',
        data: null,
      };
    }
  }

  async initPasswordReset(
    payload: InitPasswordResetDto,
  ): Promise<CustomResponse> {
    const { email, phoneNumber } = payload;
    try {
      const user = email
        ? await this.prisma.user.findUnique({
            where: {
              email,
            },
          })
        : await this.prisma.user.findUnique({
            where: {
              phoneNumber,
            },
          });

      if (!user)
        throw new ForbiddenException({
          success: false,
          msg: 'Invalid phone number or email address',
          data: null,
        });

      const generatedOtp = await this.otpHelper.generateOtp(
        user.id,
        OTPEnum.PASSWORD_RESET,
        user.email,
      );

      if (email) {
        this.emailHelper.sendPasswordResetEmail(user, generatedOtp);
      } else {
        const smsBody = {
          to: phoneNumber,
          message: 'Your one-time pass is ' + generatedOtp,
        };

        await this.smsService.sendSMSPlusDND(smsBody);

        // this.emailHelper.sendPasswordResetEmail(user, generatedOtp);
      }

      return <CustomResponse>{
        success: true,
        msg: email ? 'Password reset email sent' : 'Password reset sms sent',
        data: null,
      };
    } catch (error) {
      console.log(error);

      if ((error.status = 403)) {
        throw error;
      }

      if (error.code === 'P2003') {
        const fieldName = error.meta['field_name'].split('_')[1];
        console.log(fieldName);
        throw new BadRequestException({
          success: false,
          msg: `${fieldName} ${payload[fieldName]} does not exist`,
          data: null,
        });
      }

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to send password reset email',
        data: null,
      });
    }
  }

  async resetPassword(payload: ResetPasswordDto): Promise<CustomResponse> {
    const { otp, password } = payload;
    try {
      const { valid, msg, user } = await this.otpHelper.verifyOtp(
        otp,
        OTPEnum.PASSWORD_RESET,
      );

      if (!valid) {
        throw new BadRequestException({
          success: false,
          msg: msg,
          data: null,
        });
      }

      const passwordHash = await argon.hash(password);

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
        msg: 'Password reset successfully',
        data: null,
      };
    } catch (error) {
      console.log(error);

      throw new ServiceUnavailableException({
        success: false,
        msg: 'Failed to reset password',
        data: null,
      });
    }
  }

  validateToken(jwt: string) {
    try {
      return this.jwtService.verify(jwt);
    } catch (error) {
      console.log(error);

      throw new Error('Failed to verify token');
    }
  }
}
