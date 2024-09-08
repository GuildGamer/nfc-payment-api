import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  PasswordAuthDto,
  InitPasswordResetDto,
  InitPinResetDto,
  ResendOtpDto,
  ResetPasswordDto,
  ResetPinDto,
  StationAuthDto,
} from './dto';
import { AuthDto } from './dto/auth.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { EnableTwoFactorAuthDto, TwoFactorAuthForAppDto } from './dto';
import { JwtGuard, RefreshGuard, RolesGuard } from '../common/guard';
import { GetUser, Roles } from '../common/decorator';
import { Role, Station, User } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

const OTP_RATE_TIME = process.env.OTP_RATE_TIME
  ? +process.env.OTP_RATE_TIME
  : 60;

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  logger = new Logger();

  @Post('sign-up')
  signup(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
  }

  @Post('agent/register-user')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.AGENT)
  registerUser(@Body() body: SignUpDto, @GetUser('id') userId: string) {
    return this.authService.registerUser(body, userId);
  }

  @HttpCode(200)
  @Post('sign-in')
  signIn(@Body() body: AuthDto) {
    return this.authService.pinSignIn(body, Role.CUSTOMER);
  }

  @HttpCode(200)
  @Patch('refresh-tokens')
  @UseGuards(RefreshGuard)
  refreshTokens(@Req() req: Express.Request, @GetUser() user: User) {
    const refreshToken = req.user['sentRefreshToken'];
    const isStation = req.user['isStation'];
    // console.log('CONTROLLER REFRESH TOKEN', refreshToken);
    if (isStation) {
      const station: any = user;
      return this.authService.refreshTokens(
        refreshToken,
        null,
        station as Station,
      );
    } else {
      return this.authService.refreshTokens(refreshToken, user);
    }
  }

  @HttpCode(200)
  @Post('sign-in-agent')
  signInAgent(@Body() body: PasswordAuthDto) {
    return this.authService.passwordSignIn(body, Role.AGENT);
  }

  @HttpCode(200)
  @Post('sign-in-merchant')
  signInMerchant(@Body() body: AuthDto) {
    return this.authService.pinSignIn(body, Role.MERCHANT);
  }

  @HttpCode(200)
  @Post('sign-in-business')
  signInBusiness(@Body() body: PasswordAuthDto) {
    return this.authService.passwordSignIn(body, Role.BUSINESS);
  }

  @HttpCode(200)
  @Post('sign-in-administrative')
  signInAdministrative(@Body() body: PasswordAuthDto) {
    return this.authService.adminSignIn(body);
  }

  @HttpCode(200)
  @Post('sign-in-station')
  signInStation(@Body() body: StationAuthDto) {
    return this.authService.signInStation(body);
  }

  @UseGuards(JwtGuard)
  @HttpCode(200)
  @Post('enable-two-factor-auth')
  enableTwoFactorAuth(
    @Body() body: EnableTwoFactorAuthDto,
    @GetUser() user: User,
  ) {
    return this.authService.enableTwoFactorAuth(body, user);
  }

  @HttpCode(200)
  @Get('verify-email-otp/:otp')
  verify2FAOtp(@Param('otp') otpString: string) {
    return this.authService.completeTwoFactorAuthenticationWithOtp(otpString);
  }

  @HttpCode(200)
  @Post('verify-app-token')
  verifyAppToken(@Body() body: TwoFactorAuthForAppDto) {
    return this.authService.completeTwoFactorAuthenticationWithApp(body);
  }

  @Throttle(1, OTP_RATE_TIME)
  @HttpCode(200)
  @Post('resend-otp')
  resendOtp(@Body() body: ResendOtpDto) {
    return this.authService.resendOtp(body);
  }

  @HttpCode(200)
  @UseGuards(JwtGuard)
  @Get('resend-token/')
  resendToken(@GetUser() user: User) {
    return this.authService.resendToken(user);
  }

  @HttpCode(200)
  @Get('verify-phone/:otp')
  verifyPhoneNumber(@Param('otp') otp: string) {
    return this.authService.verifyPhoneNumber(otp);
  }

  @HttpCode(200)
  @Get('verify-email/:otp')
  verifyEmail(@Param('otp') otp: string) {
    return this.authService.verifyEmail(otp);
  }

  @Throttle(1, OTP_RATE_TIME)
  @HttpCode(200)
  @Post('init-password-reset')
  initPasswordReset(@Body() body: InitPasswordResetDto) {
    return this.authService.initPasswordReset(body);
  }

  @HttpCode(201)
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @Throttle(1, OTP_RATE_TIME)
  @HttpCode(200)
  @Post('init-pin-reset')
  initPinReset(@Body() body: InitPinResetDto) {
    return this.authService.initPinReset(body);
  }

  @HttpCode(201)
  @Post('reset-pin')
  resetPin(@Body() body: ResetPinDto) {
    return this.authService.resetPin(body);
  }
}
