import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { GetUser, Roles } from 'src/common/decorator';
import { BusinessGuard, JwtGuard, RolesGuard } from 'src/common/guard';
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
import { BusinessService } from './business.service';
import { Throttle } from '@nestjs/throttler';

const OTP_RATE_TIME = process.env.OTP_RATE_TIME
  ? +process.env.OTP_RATE_TIME
  : 60;

@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Post('schedule-a-call')
  scheduleACall(@Body() dto: ScheduleCallDto) {
    return this.businessService.scheduleCall(dto);
  }
  @Post('register-business')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.BUSINESS)
  registerBusiness(
    @Body() registerBusinessDto: RegisterBusinessDto,
    @GetUser('id') userId: string,
  ) {
    return this.businessService.registerBusiness(registerBusinessDto, userId);
  }

  @Throttle(1, OTP_RATE_TIME)
  @HttpCode(200)
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  @Post('resend-otp')
  resendOTP(@GetUser() user: User) {
    return this.businessService.resendOTP(user);
  }

  @Patch('update')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  updateBusiness(@Body() dto: UpdateBusinessDto, @GetUser() user: User) {
    return this.businessService.updateBusiness(dto, user);
  }

  @HttpCode(200)
  @Patch('verify-email/:otp')
  verifyBusinessEmail(@Param('otp') otp: string) {
    return this.businessService.verifyEmail(otp);
  }

  @Get('my-business')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  getMyBusiness(@GetUser() user: User) {
    return this.businessService.getMyBusiness(user);
  }

  @Get('get-dashboard-data')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  getMyDashboardData(@GetUser() user: User) {
    return this.businessService.getMyDashboardData(user);
  }

  @Get('my-transactions')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  getMyTransactions(
    @Query() getTransactionsDto: GetTransactionsDto,
    @GetUser() user: User,
  ) {
    return this.businessService.getTransactions(getTransactionsDto, user);
  }

  @Post('add-bank-account')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  addBankAccount(
    @Body() addBankAcountForBusinessDto: AddBankAcountForBusinessDto,
    @GetUser() user: User,
  ) {
    return this.businessService.addBankAccount(
      addBankAcountForBusinessDto,
      user,
    );
  }

  @Post('create-station')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  createStation(
    @Body() createStationDto: CreateStationDto,
    @GetUser('businessId') businessId: string,
  ) {
    return this.businessService.createStation(createStationDto, businessId);
  }

  @Patch('update-station')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  updateStation(
    @Body() updateStationDto: UpdateStationDto,
    @GetUser('businessId') businessId: string,
  ) {
    return this.businessService.updateStation(updateStationDto, businessId);
  }

  @Patch('station/change-password')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  changePassword(@Body() changePasswordDto: ChangeStationPasswordDto) {
    return this.businessService.changeStationPassword(changePasswordDto);
  }

  @Throttle(1, OTP_RATE_TIME)
  @HttpCode(200)
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  @Patch('station/init-password-reset')
  initPasswordReset(@GetUser() user: User) {
    return this.businessService.initStationPasswordReset(user);
  }

  @HttpCode(201)
  @Patch('station/complete-station-password-reset')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  completePasswordReset(
    @Body() completePasswordResetDto: CompleteStationPasswordResetDto,
  ) {
    return this.businessService.completeStationPasswordReset(
      completePasswordResetDto,
    );
  }

  @Get('my-stations')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  getMyStations(
    @Query() getStationsDto: GetStationsDto,
    @GetUser() user: User,
  ) {
    return this.businessService.getStations(getStationsDto, user);
  }

  @Delete('delete-station/:id')
  @UseGuards(JwtGuard, RolesGuard, BusinessGuard)
  @Roles(Role.BUSINESS)
  deleteStation(@Param('id') stationId: string, @GetUser() user: User) {
    return this.businessService.deleteStations(user, stationId);
  }
}
